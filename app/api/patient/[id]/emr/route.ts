export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/ServerAuth';
import { randomUUID } from 'crypto';
import { addAuditLog } from '@/lib/services/audit.service'; 
import sharp from 'sharp';
import busboy from 'busboy';
import {
  uploadFileToDriveWithAdmin,
  deleteFileFromDriveWithAdmin,
  getOrCreateEmrFolderWithAdmin,
} from '@/lib/googleDrive';
import { isValidDateOnly, parsePositiveIntParam } from '@/lib/validation';

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 10;
const MAX_BODY_BYTES = 120 * 1024 * 1024;

const boundedOptionalText = (max: number) => z.string().trim().max(max).optional();

const emrSchema = z
  .object({
    queueId: z.coerce.number().int().positive('queueId harus berupa angka').max(2_147_483_647),
    keluhanUtama: boundedOptionalText(2000),
    diagnosa: z.string().trim().min(1, 'Diagnosa wajib diisi').max(4000),
    tindakan: z.string().trim().min(1, 'Tindakan wajib diisi').max(4000),
    resepObat: boundedOptionalText(4000),
    catatanTambahan: boundedOptionalText(8000),
    dokterPenanggungJawab: z
      .string()
      .trim()
      .min(1, 'Dokter penanggung jawab wajib diisi')
      .max(120),
    followUpDate: z
      .string()
      .refine(isValidDateOnly, 'Tanggal kontrol tidak valid')
      .transform((value) => new Date(`${value}T00:00:00.000Z`))
      .optional(),
    followUpTime: z.string().trim().max(40).optional(),
  })
  .strict('Field rekam medis tidak dikenal');

class MultipartPayloadError extends Error {
  constructor(public readonly kind: 'too_large' | 'too_many_files' | 'invalid') {
    super(kind);
  }
}

async function parseMultipartForm(req: NextRequest): Promise<{ fields: any; files: any[] }> {
  const declaredLength = Number(req.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new MultipartPayloadError('too_large');
  }

  return new Promise((resolve, reject) => {
    const headers = Object.fromEntries(req.headers);
    const bb = busboy({
      headers,
      limits: {
        fileSize: MAX_FILE_BYTES,
        files: MAX_FILES,
        fields: 30,
        fieldSize: 100_000,
        parts: 40,
      },
    });
    const fields: any = {};
    const files: any[] = [];
    let rejected = false;

    bb.on('field', (name, value) => {
      fields[name] = value;
    });

    bb.on('file', (name, file, info) => {
      const { filename, mimeType } = info;
      const chunks: Buffer[] = [];
      file.on('data', (chunk) => chunks.push(chunk));
      file.on('limit', () => {
        rejected = true;
      });
      file.on('end', () => {
        files.push({
          fieldname: name,
          originalname: String(filename || 'foto').slice(0, 255),
          mimetype: mimeType,
          buffer: Buffer.concat(chunks),
        });
      });
    });

    bb.on('filesLimit', () => {
      rejected = true;
    });

    bb.on('close', () => {
      if (rejected) {
        reject(new MultipartPayloadError(files.length > MAX_FILES ? 'too_many_files' : 'too_large'));
        return;
      }
      resolve({ fields, files });
    });
    bb.on('error', (err) => reject(err));

    req.arrayBuffer()
      .then((buffer) => {
        if (buffer.byteLength > MAX_BODY_BYTES) {
          reject(new MultipartPayloadError('too_large'));
          return;
        }
        bb.end(Buffer.from(buffer));
      })
      .catch((err) => reject(err));
  });
}

// Tambahkan fungsi validasi magic number untuk memastikan file benar-benar PNG/JPG
function validateImageFormat(buffer: Buffer): { valid: boolean; mime: string | null } {
  if (buffer.length < 8) return { valid: false, mime: null };
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
                buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A;
  // JPEG signature: FF D8
  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8;
  if (isPng) return { valid: true, mime: 'image/png' };
  if (isJpeg) return { valid: true, mime: 'image/jpeg' };
  return { valid: false, mime: null };
}

async function compressImage(
  buffer: Buffer
): Promise<{ buffer: Buffer; mime: 'image/jpeg' | 'image/png' }> {
  const { valid, mime } = validateImageFormat(buffer);
  if (!valid || !mime) {
    throw new Error('File bukan PNG atau JPEG yang valid (magic number mismatch)');
  }
  const confirmedMime = mime as 'image/jpeg' | 'image/png';
  try {
    return {
      buffer: await sharp(buffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer(),
      mime: 'image/jpeg',
    };
  } catch (err) {
    console.error(
      'Compression failed, using original:',
      err instanceof Error ? err.message : 'unknown error'
    );
    return { buffer, mime: confirmedMime };
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyAdminToken(req);
  if (!authResult.valid) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status || 401 });
  }
  const adminUsername = authResult.username || 'unknown'; 

  const patientId = parsePositiveIntParam(params.id);
  if (!patientId) {
    return NextResponse.json({ success: false, error: 'Invalid patient ID' }, { status: 400 });
  }

  let fields, files;
  try {
    const parsed = await parseMultipartForm(req);
    fields = parsed.fields;
    files = parsed.files;
  } catch (err) {
    if (err instanceof MultipartPayloadError && err.kind === 'too_large') {
      return NextResponse.json(
        { success: false, error: 'Ukuran unggahan terlalu besar' },
        { status: 413 }
      );
    }
    if (err instanceof MultipartPayloadError && err.kind === 'too_many_files') {
      return NextResponse.json(
        { success: false, error: 'Jumlah foto melebihi batas' },
        { status: 400 }
      );
    }
    console.error(
      '[EMR Upload] gagal membaca form:',
      err instanceof Error ? err.message : 'unknown error'
    );
    return NextResponse.json({ success: false, error: 'Failed to parse form data' }, { status: 400 });
  }

  const parsedFields = emrSchema.safeParse(fields);
  if (!parsedFields.success) {
    return NextResponse.json({ success: false, error: parsedFields.error.errors[0].message }, { status: 400 });
  }
  const validated = parsedFields.data;

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
  }

  const queue = await prisma.queue.findFirst({
    where: { id: validated.queueId, patientId },
  });
  if (!queue) {
    return NextResponse.json({ success: false, error: 'Queue not found for this patient' }, { status: 400 });
  }

  for (const file of files) {
    if (file.buffer.length > MAX_FILE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Ukuran foto melebihi 50MB' },
        { status: 413 }
      );
    }
  }

  let visit = await prisma.medicalVisit.findUnique({
    where: { queueId: validated.queueId },
  });
  const isUpdate = Boolean(visit);

  if (visit) {
    visit = await prisma.medicalVisit.update({
      where: { id: visit.id },
      data: {
        keluhanUtama: validated.keluhanUtama,
        diagnosa: validated.diagnosa,
        tindakan: validated.tindakan,
        resepObat: validated.resepObat,
        catatanTambahan: validated.catatanTambahan,
        dokterPenanggungJawab: validated.dokterPenanggungJawab,
        followUpDate: validated.followUpDate,
        followUpTime: validated.followUpTime,
      },
    });
  } else {
    visit = await prisma.medicalVisit.create({
      data: {
        patientId,
        queueId: validated.queueId,
        keluhanUtama: validated.keluhanUtama,
        diagnosa: validated.diagnosa,
        tindakan: validated.tindakan,
        resepObat: validated.resepObat,
        catatanTambahan: validated.catatanTambahan,
        dokterPenanggungJawab: validated.dokterPenanggungJawab,
        followUpDate: validated.followUpDate,
        followUpTime: validated.followUpTime,
      },
    });
  }

  await addAuditLog(
    adminUsername,
    isUpdate ? 'UPDATE_EMR' : 'CREATE_EMR',
    'medical_visit',
    visit.id.toString(),
    { patientId, queueId: validated.queueId, diagnosa: validated.diagnosa, tindakan: validated.tindakan },
    req.headers.get('x-forwarded-for') || 'unknown'
  );

  const uploadedPhotos = [];
  for (const file of files) {
    try {
      const compressed = await compressImage(file.buffer);
      const fileExt = compressed.mime === 'image/png' ? 'png' : 'jpg';
      const fileName = `${randomUUID()}.${fileExt}`;
      const folderId = await getOrCreateEmrFolderWithAdmin(patientId, visit.id, adminUsername);
      const { fileId, webViewLink } = await uploadFileToDriveWithAdmin(
        compressed.buffer,
        fileName,
        compressed.mime,
        folderId,
        adminUsername
      );
      const photo = await prisma.medicalPhoto.create({
        data: {
          visitId: visit.id,
          fileId: fileId,
          fileUrl: webViewLink,
          fileName: file.originalname,
        },
      });
      uploadedPhotos.push(photo);
    } catch (err) {
      console.error(
        '[EMR Upload] gagal mengunggah foto:',
        err instanceof Error ? err.message : 'unknown error'
      );
      return NextResponse.json(
        { success: false, error: 'Foto gagal diunggah. Silakan coba lagi.' },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    visit_id: visit.id,
    uploaded_photos_count: uploadedPhotos.length,
  }, { status: 201 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyAdminToken(req);
  if (!authResult.valid) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status || 401 });
  }

  const patientId = parsePositiveIntParam(params.id);
  if (!patientId) {
    return NextResponse.json({ success: false, error: 'Invalid patient ID' }, { status: 400 });
  }

  const url = new URL(req.url);
  const visitIdParam = url.searchParams.get('visitId');

  try {
    let visits;
    if (visitIdParam) {
      const visitId = parsePositiveIntParam(visitIdParam);
      if (!visitId) {
        return NextResponse.json({ success: false, error: 'Invalid visitId' }, { status: 400 });
      }
      visits = await prisma.medicalVisit.findMany({
        where: { id: visitId, patientId },
        include: {
          photos: { orderBy: { uploadedAt: 'asc' } },
          queue: { select: { queueNumber: true, date: true } },
        },
      });
    } else {
      visits = await prisma.medicalVisit.findMany({
        where: { patientId },
        include: {
          photos: { orderBy: { uploadedAt: 'asc' } },
          queue: { select: { queueNumber: true, date: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    const formattedVisits = visits.map((visit: any) => ({
      id: visit.id,
      queueId: visit.queueId,
      queueNumber: visit.queue?.queueNumber ?? null,
      queueDate: visit.queue?.date ?? null,
      keluhanUtama: visit.keluhanUtama,
      diagnosa: visit.diagnosa,
      tindakan: visit.tindakan,
      resepObat: visit.resepObat,
      catatanTambahan: visit.catatanTambahan,
      dokterPenanggungJawab: visit.dokterPenanggungJawab,
      followUpDate: visit.followUpDate,
      followUpTime: visit.followUpTime,
      createdAt: visit.createdAt,
      updatedAt: visit.updatedAt,
      photos: visit.photos.map((photo: any) => ({
        id: photo.id,
        fileId: photo.fileId,
        fileName: photo.fileName,
        uploadedAt: photo.uploadedAt,
        // FIX: URL proxy untuk ditampilkan di frontend
        url: `/api/drive/image/${photo.fileId}`,
      })),
    }));

    return NextResponse.json(
      { success: true, data: formattedVisits },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error(
      '[GET /api/patient/:id/emr] gagal memuat rekam medis:',
      error instanceof Error ? error.message : 'unknown error'
    );
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

const updateEmrSchema = emrSchema.extend({
  deletePhotoIds: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .refine(
      (value) => !value || value.split(',').every((id) => /^\d{1,10}$/.test(id.trim())),
      'ID foto tidak valid'
    ),
});

// Ubah fungsi deletePhotoFromDrive menggunakan deleteFileFromDriveWithAdmin
async function deletePhotoFromDrive(fileId: string, adminUsername: string) {
  if (!fileId) return;
  try {
    await deleteFileFromDriveWithAdmin(fileId, adminUsername);
  } catch (err) {
    console.error(
      '[EMR Upload] gagal menghapus foto dari Drive:',
      err instanceof Error ? err.message : 'unknown error'
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyAdminToken(req);
  if (!authResult.valid) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status || 401 });
  }
  const adminUsername = authResult.username || 'unknown'; 

  const patientId = parsePositiveIntParam(params.id);
  if (!patientId) {
    return NextResponse.json({ success: false, error: 'Invalid patient ID' }, { status: 400 });
  }

  const url = new URL(req.url);
  const visitIdParam = url.searchParams.get('visitId');
  if (!visitIdParam) {
    return NextResponse.json({ success: false, error: 'Missing visitId query parameter' }, { status: 400 });
  }
  const visitId = parsePositiveIntParam(visitIdParam);
  if (!visitId) {
    return NextResponse.json({ success: false, error: 'Invalid visitId' }, { status: 400 });
  }

  let fields, files;
  try {
    const parsed = await parseMultipartForm(req);
    fields = parsed.fields;
    files = parsed.files;
  } catch (err) {
    if (err instanceof MultipartPayloadError && err.kind === 'too_large') {
      return NextResponse.json(
        { success: false, error: 'Ukuran unggahan terlalu besar' },
        { status: 413 }
      );
    }
    if (err instanceof MultipartPayloadError && err.kind === 'too_many_files') {
      return NextResponse.json(
        { success: false, error: 'Jumlah foto melebihi batas' },
        { status: 400 }
      );
    }
    console.error(
      '[EMR Upload] gagal membaca form:',
      err instanceof Error ? err.message : 'unknown error'
    );
    return NextResponse.json({ success: false, error: 'Failed to parse form data' }, { status: 400 });
  }

  const parsedFields = updateEmrSchema.safeParse(fields);
  if (!parsedFields.success) {
    return NextResponse.json({ success: false, error: parsedFields.error.errors[0].message }, { status: 400 });
  }
  const validated = parsedFields.data;

  const existingVisit = await prisma.medicalVisit.findFirst({
    where: { id: visitId, patientId },
    include: { photos: true },
  });
  if (!existingVisit) {
    return NextResponse.json({ success: false, error: 'Visit not found or not owned by patient' }, { status: 404 });
  }

  const queue = await prisma.queue.findFirst({
    where: { id: validated.queueId, patientId },
  });
  if (!queue) {
    return NextResponse.json({ success: false, error: 'Queue not found for this patient' }, { status: 400 });
  }

  if (validated.queueId !== existingVisit.queueId) {
    const queueAlreadyUsed = await prisma.medicalVisit.findUnique({
      where: { queueId: validated.queueId },
    });
    if (queueAlreadyUsed) {
      return NextResponse.json(
        { success: false, error: 'Referensi antrean sudah dipakai oleh rekam medis lain' },
        { status: 409 }
      );
    }
  }

  const updatedVisit = await prisma.medicalVisit.update({
    where: { id: visitId },
    data: {
      keluhanUtama: validated.keluhanUtama,
      diagnosa: validated.diagnosa,
      tindakan: validated.tindakan,
      resepObat: validated.resepObat,
      catatanTambahan: validated.catatanTambahan,
      dokterPenanggungJawab: validated.dokterPenanggungJawab,
      followUpDate: validated.followUpDate,
      followUpTime: validated.followUpTime,
    },
  });

  await addAuditLog(
    adminUsername,
    'UPDATE_EMR',
    'medical_visit',
    visitId.toString(),
    { changes: validated, deletedPhotos: validated.deletePhotoIds },
    req.headers.get('x-forwarded-for') || 'unknown'
  );

  if (validated.deletePhotoIds) {
    const idsToDelete = validated.deletePhotoIds
      .split(',')
      .map((id: string) => parsePositiveIntParam(id.trim()))
      .filter((id): id is number => id !== null);
    for (const id of idsToDelete) {
      const photo = existingVisit.photos.find((p: any) => p.id === id);
      if (photo && photo.fileId) {
        await deletePhotoFromDrive(photo.fileId, adminUsername);
        await prisma.medicalPhoto.delete({ where: { id: photo.id } });
      }
    }
  }

  const uploadedPhotos = [];
  for (const file of files) {
    try {
      const compressed = await compressImage(file.buffer);
      const fileExt = compressed.mime === 'image/png' ? 'png' : 'jpg';
      const fileName = `${randomUUID()}.${fileExt}`;
      const folderId = await getOrCreateEmrFolderWithAdmin(patientId, updatedVisit.id, adminUsername);
      const { fileId, webViewLink } = await uploadFileToDriveWithAdmin(
        compressed.buffer,
        fileName,
        compressed.mime,
        folderId,
        adminUsername
      );
      const photo = await prisma.medicalPhoto.create({
        data: {
          visitId: updatedVisit.id,
          fileId: fileId,
          fileUrl: webViewLink,
          fileName: file.originalname,
        },
      });
      uploadedPhotos.push(photo);
    } catch (err) {
      console.error(
        '[EMR Upload] gagal mengunggah foto:',
        err instanceof Error ? err.message : 'unknown error'
      );
      return NextResponse.json(
        { success: false, error: 'Foto gagal diunggah. Silakan coba lagi.' },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    message: 'EMR berhasil diupdate',
    data: {
      id: updatedVisit.id,
      updatedAt: updatedVisit.updatedAt,
    },
  });
}