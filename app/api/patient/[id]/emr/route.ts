// FIX: Perbaiki GET untuk mendukung parameter visitId dan error handling URL foto
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
  getFileUrlWithAdmin,
  getOrCreateEmrFolderWithAdmin,
} from '@/lib/googleDrive';

const emrSchema = z.object({
  queueId: z.coerce.number().int().positive('queueId harus berupa angka'),
  keluhanUtama: z.string().optional(),
  diagnosa: z.string().min(1, 'Diagnosa wajib diisi'),
  tindakan: z.string().min(1, 'Tindakan wajib diisi'),
  resepObat: z.string().optional(),
  catatanTambahan: z.string().optional(),
  dokterPenanggungJawab: z.string().min(1, 'Dokter penanggung jawab wajib diisi'),
  followUpDate: z.string().optional().transform(val => (val ? new Date(val) : undefined)),
});

async function parseMultipartForm(req: NextRequest): Promise<{ fields: any; files: any[] }> {
  return new Promise((resolve, reject) => {
    const headers = Object.fromEntries(req.headers);
    const bb = busboy({ headers });
    const fields: any = {};
    const files: any[] = [];

    bb.on('field', (name, value) => {
      fields[name] = value;
    });

    bb.on('file', (name, file, info) => {
      const { filename, mimeType } = info;
      const chunks: Buffer[] = [];
      file.on('data', (chunk) => chunks.push(chunk));
      file.on('end', () => {
        files.push({
          fieldname: name,
          originalname: filename,
          mimetype: mimeType,
          buffer: Buffer.concat(chunks),
        });
      });
    });

    bb.on('close', () => {
      resolve({ fields, files });
    });
    bb.on('error', (err) => reject(err));

    req.arrayBuffer()
      .then(buffer => {
        bb.end(Buffer.from(buffer));
      })
      .catch(err => reject(err));
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

async function compressImage(buffer: Buffer, mimetype: string): Promise<Buffer> {
  const { valid, mime } = validateImageFormat(buffer);
  if (!valid) {
    throw new Error('File bukan PNG atau JPEG yang valid (magic number mismatch)');
  }
  const actualMime = mime || mimetype;
  if (actualMime === 'image/jpeg' || actualMime === 'image/png') {
    try {
      return await sharp(buffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (err) {
      console.error('Compression failed, using original', err);
      return buffer;
    }
  }
  return buffer; 
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

  const patientId = parseInt(params.id);
  if (isNaN(patientId)) {
    return NextResponse.json({ success: false, error: 'Invalid patient ID' }, { status: 400 });
  }

  let fields, files;
  try {
    const parsed = await parseMultipartForm(req);
    fields = parsed.fields;
    files = parsed.files;
  } catch (err) {
    console.error(err);
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
    where: { id: validated.queueId, patientId, status: 'COMPLETED' },
  });
  if (!queue) {
    return NextResponse.json({ success: false, error: 'Queue not found or not completed' }, { status: 400 });
  }

  const maxFileSize = 50 * 1024 * 1024;
  for (const file of files) {
    if (file.buffer.length > maxFileSize) {
      return NextResponse.json({ success: false, error: `File ${file.originalname} melebihi 50MB` }, { status: 400 });
    }
  }

  let visit = await prisma.medicalVisit.findUnique({
    where: { queueId: validated.queueId },
  });

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
      },
    });
  }

  await addAuditLog(
    adminUsername,
    'CREATE_EMR',
    'medical_visit',
    visit.id.toString(),
    { patientId, queueId: validated.queueId, diagnosa: validated.diagnosa, tindakan: validated.tindakan },
    req.headers.get('x-forwarded-for') || 'unknown'
  );

  const uploadedPhotos = [];
  for (const file of files) {
    try {
      console.log(`[EMR Upload] Processing file: ${file.originalname}`);
      const { valid, mime: detectedMime } = validateImageFormat(file.buffer);
      if (!valid) {
        throw new Error(`File ${file.originalname} tidak dikenali sebagai PNG/JPEG yang valid`);
      }
      console.log(`[EMR Upload] Valid image format: ${detectedMime}`);
      const compressedBuffer = await compressImage(file.buffer, file.mimetype);
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${randomUUID()}.${fileExt}`;
      console.log(`[EMR Upload] Getting folder for patient ${patientId}, visit ${visit.id}`);
      // Fungsi OAuth2 admin untuk folder
      const folderId = await getOrCreateEmrFolderWithAdmin(patientId, visit.id, adminUsername);
      console.log(`[EMR Upload] Folder ID: ${folderId}`);
      // Fungsi OAuth2 admin untuk upload
      const { fileId, webViewLink } = await uploadFileToDriveWithAdmin(
        compressedBuffer,
        fileName,
        file.mimetype,
        folderId,
        adminUsername
      );
      console.log(`[EMR Upload] Uploaded fileId: ${fileId}`);
      const photo = await prisma.medicalPhoto.create({
        data: {
          visitId: visit.id,
          fileId: fileId,
          fileUrl: webViewLink,
          fileName: file.originalname,
        },
      });
      uploadedPhotos.push(photo);
    } catch (err: any) {
      console.error(`[EMR Upload] Error for file ${file.originalname}:`, err);
      return NextResponse.json(
        { success: false, error: `Upload failed for ${file.originalname}: ${err.message}` },
        { status: 500 }
      );
    }
  }

  console.log(`[Audit] Admin ${adminUsername} upserted medical visit for patient ${patientId} (visit ${visit.id}) with ${uploadedPhotos.length} photos`);

  return NextResponse.json({
    success: true,
    visit_id: visit.id,
    uploaded_photos_count: uploadedPhotos.length,
  }, { status: 201 });
}

// GET dengan dukungan parameter visitId dan error handling URL
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyAdminToken(req);
  if (!authResult.valid) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status || 401 });
  }
  const adminUsername = authResult.username || 'unknown';

  const patientId = parseInt(params.id);
  if (isNaN(patientId)) {
    return NextResponse.json({ success: false, error: 'Invalid patient ID' }, { status: 400 });
  }

  const url = new URL(req.url);
  const visitIdParam = url.searchParams.get('visitId');

  let visits;
  if (visitIdParam) {
    const visitId = parseInt(visitIdParam);
    if (isNaN(visitId)) {
      return NextResponse.json({ success: false, error: 'Invalid visitId' }, { status: 400 });
    }
    visits = await prisma.medicalVisit.findMany({
      where: { id: visitId, patientId },
      include: { photos: { orderBy: { uploadedAt: 'asc' } } },
    });
  } else {
    visits = await prisma.medicalVisit.findMany({
      where: { patientId },
      include: { photos: { orderBy: { uploadedAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  const formattedVisits = await Promise.all(visits.map(async (visit: any) => ({
    id: visit.id,
    queueId: visit.queueId,
    keluhanUtama: visit.keluhanUtama,
    diagnosa: visit.diagnosa,
    tindakan: visit.tindakan,
    resepObat: visit.resepObat,
    catatanTambahan: visit.catatanTambahan,
    dokterPenanggungJawab: visit.dokterPenanggungJawab,
    followUpDate: visit.followUpDate,
    createdAt: visit.createdAt,
    updatedAt: visit.updatedAt,
    photos: await Promise.all(visit.photos.map(async (photo: any) => {
      let url = photo.fileUrl;
      if (photo.fileId) {
        try {
          url = await getFileUrlWithAdmin(photo.fileId, adminUsername);
        } catch (err) {
          console.error(`[GET EMR] Failed to get URL for photo ${photo.id}:`, err);
          url = photo.fileUrl;
        }
      }
      return {
        id: photo.id,
        url,
        fileName: photo.fileName,
        uploadedAt: photo.uploadedAt,
      };
    })),
  })));

  return NextResponse.json({ success: true, data: formattedVisits });
}

const updateEmrSchema = z.object({
  queueId: z.coerce.number().int().positive('queueId harus berupa angka'),
  keluhanUtama: z.string().optional(),
  diagnosa: z.string().min(1, 'Diagnosa wajib diisi'),
  tindakan: z.string().min(1, 'Tindakan wajib diisi'),
  resepObat: z.string().optional(),
  catatanTambahan: z.string().optional(),
  dokterPenanggungJawab: z.string().min(1, 'Dokter penanggung jawab wajib diisi'),
  followUpDate: z.string().optional().transform(val => (val ? new Date(val) : undefined)),
  deletePhotoIds: z.string().optional(),
});

// Ubah fungsi deletePhotoFromDrive menggunakan deleteFileFromDriveWithAdmin
async function deletePhotoFromDrive(fileId: string, adminUsername: string) {
  if (!fileId) return;
  try {
    await deleteFileFromDriveWithAdmin(fileId, adminUsername);
    console.log(`Deleted file from Drive: ${fileId}`);
  } catch (err) {
    console.error(`Failed to delete file from Drive: ${fileId}`, err);
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

  const patientId = parseInt(params.id);
  if (isNaN(patientId)) {
    return NextResponse.json({ success: false, error: 'Invalid patient ID' }, { status: 400 });
  }

  const url = new URL(req.url);
  const visitIdParam = url.searchParams.get('visitId');
  if (!visitIdParam) {
    return NextResponse.json({ success: false, error: 'Missing visitId query parameter' }, { status: 400 });
  }
  const visitId = parseInt(visitIdParam);
  if (isNaN(visitId)) {
    return NextResponse.json({ success: false, error: 'Invalid visitId' }, { status: 400 });
  }

  let fields, files;
  try {
    const parsed = await parseMultipartForm(req);
    fields = parsed.fields;
    files = parsed.files;
  } catch (err) {
    console.error(err);
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
    where: { id: validated.queueId, patientId, status: 'COMPLETED' },
  });
  if (!queue) {
    return NextResponse.json({ success: false, error: 'Queue not found or not completed' }, { status: 400 });
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
    const idsToDelete = validated.deletePhotoIds.split(',').map((id: string) => parseInt(id.trim()));
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
      const { valid, mime: detectedMime } = validateImageFormat(file.buffer);
      if (!valid) {
        throw new Error(`File ${file.originalname} tidak dikenali sebagai PNG/JPEG yang valid`);
      }
      const compressedBuffer = await compressImage(file.buffer, file.mimetype);
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${randomUUID()}.${fileExt}`;
      // Fungsi OAuth2 admin untuk folder
      const folderId = await getOrCreateEmrFolderWithAdmin(patientId, updatedVisit.id, adminUsername);
      // Fungsi OAuth2 admin untuk upload
      const { fileId, webViewLink } = await uploadFileToDriveWithAdmin(
        compressedBuffer,
        fileName,
        file.mimetype,
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
    } catch (err: any) {
      console.error(`[EMR Upload] Error updating file ${file.originalname}:`, err);
      return NextResponse.json(
        { success: false, error: `Upload failed for ${file.originalname}: ${err.message}` },
        { status: 500 }
      );
    }
  }

  console.log(`[Audit] Admin ${adminUsername} updated medical visit ${visitId} for patient ${patientId}, added ${uploadedPhotos.length} photos`);

  return NextResponse.json({
    success: true,
    message: 'EMR berhasil diupdate',
    data: {
      id: updatedVisit.id,
      updatedAt: updatedVisit.updatedAt,
    },
  });
}