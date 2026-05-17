import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/ServerAuth';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { addAuditLog } from '@/lib/services/audit.service'; 
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import busboy from 'busboy';

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
    const bb = busboy({ headers: Object.fromEntries(req.headers) });
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

    const reader = req.body?.getReader();
    if (!reader) return reject(new Error('No body'));
    const chunks: Buffer[] = [];
    const readStream = async () => {
      try {
        let done = false;
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          if (value) chunks.push(Buffer.from(value));
          done = doneReading;
        }
        const buffer = Buffer.concat(chunks);
        bb.end(buffer);
      } catch (err) {
        reject(err);
      }
    };
    readStream();
  });
}

async function compressImage(buffer: Buffer, mimetype: string): Promise<Buffer> {
  if (mimetype === 'image/jpeg' || mimetype === 'image/png') {
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

/**
 * @openapi
 * /api/patient/{id}/emr:
 *   post:
 *     summary: Tambah atau update EMR pasien (kunjungan baru)
 *     tags: [EMR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID pasien
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - queueId
 *               - diagnosa
 *               - tindakan
 *               - dokterPenanggungJawab
 *             properties:
 *               queueId:
 *                 type: integer
 *               keluhanUtama:
 *                 type: string
 *               diagnosa:
 *                 type: string
 *               tindakan:
 *                 type: string
 *               resepObat:
 *                 type: string
 *               catatanTambahan:
 *                 type: string
 *               dokterPenanggungJawab:
 *                 type: string
 *               followUpDate:
 *                 type: string
 *                 format: date
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: EMR berhasil disimpan
 *       400:
 *         description: Input tidak valid
 *       401:
 *         description: Tidak terautentikasi
 */
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
  const baseUploadDir = path.join(process.cwd(), 'public', 'uploads', 'emr');
  const visitDir = path.join(baseUploadDir, `patient_${patientId}`, `visit_${visit.id}`);
  await mkdir(visitDir, { recursive: true });

  for (const file of files) {
    const compressedBuffer = await compressImage(file.buffer, file.mimetype);
    const fileExt = path.extname(file.originalname);
    const fileName = `${randomUUID()}${fileExt}`;
    const relativeFilePath = `uploads/emr/patient_${patientId}/visit_${visit.id}/${fileName}`;
    const absoluteFilePath = path.join(process.cwd(), 'public', relativeFilePath);
    await writeFile(absoluteFilePath, compressedBuffer);
    const fileUrl = `/${relativeFilePath}`;
    const photo = await prisma.medicalPhoto.create({
      data: {
        visitId: visit.id,
        fileUrl,
        fileName: file.originalname,
      },
    });
    uploadedPhotos.push(photo);
  }

  console.log(`[Audit] Admin ${adminUsername} upserted medical visit for patient ${patientId} (visit ${visit.id}) with ${uploadedPhotos.length} photos`);

  return NextResponse.json({
    success: true,
    visit_id: visit.id,
    uploaded_photos_count: uploadedPhotos.length,
  }, { status: 201 });
}

/**
 * @openapi
 * /api/patient/{id}/emr:
 *   get:
 *     summary: Mendapatkan histori EMR pasien
 *     tags: [EMR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID pasien
 *     responses:
 *       200:
 *         description: Histori EMR berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MedicalVisit'
 *       401:
 *         description: Tidak terautentikasi
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyAdminToken(req);
  if (!authResult.valid) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status || 401 });
  }

  const patientId = parseInt(params.id);
  if (isNaN(patientId)) {
    return NextResponse.json({ success: false, error: 'Invalid patient ID' }, { status: 400 });
  }

  const visits = await prisma.medicalVisit.findMany({
    where: { patientId },
    include: { photos: { orderBy: { uploadedAt: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });

  const formattedVisits = visits.map(visit => ({
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
    photos: visit.photos.map(photo => ({
      id: photo.id,
      url: photo.fileUrl,
      fileName: photo.fileName,
      uploadedAt: photo.uploadedAt,
    })),
  }));

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

async function deletePhysicalFile(fileUrl: string) {
  if (!fileUrl) return;
  const absolutePath = path.join(process.cwd(), 'public', fileUrl);
  try {
    if (fs.existsSync(absolutePath)) {
      await fs.promises.unlink(absolutePath);
      console.log(`Deleted file: ${absolutePath}`);
    }
  } catch (err) {
    console.error(`Failed to delete file ${absolutePath}:`, err);
  }
}

/**
 * @openapi
 * /api/patient/{id}/emr:
 *   put:
 *     summary: Mengupdate EMR yang sudah ada (beserta foto)
 *     tags: [EMR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID pasien
 *       - in: query
 *         name: visitId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID kunjungan yang akan diupdate
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - queueId
 *               - diagnosa
 *               - tindakan
 *               - dokterPenanggungJawab
 *             properties:
 *               queueId:
 *                 type: integer
 *               keluhanUtama:
 *                 type: string
 *               diagnosa:
 *                 type: string
 *               tindakan:
 *                 type: string
 *               resepObat:
 *                 type: string
 *               catatanTambahan:
 *                 type: string
 *               dokterPenanggungJawab:
 *                 type: string
 *               followUpDate:
 *                 type: string
 *                 format: date
 *               deletePhotoIds:
 *                 type: string
 *                 description: ID foto yang akan dihapus, dipisahkan koma
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: EMR berhasil diupdate
 *       400:
 *         description: Input tidak valid
 *       401:
 *         description: Tidak terautentikasi
 */
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
    const idsToDelete = validated.deletePhotoIds.split(',').map(id => parseInt(id.trim()));
    for (const id of idsToDelete) {
      const photo = existingVisit.photos.find(p => p.id === id);
      if (photo) {
        await deletePhysicalFile(photo.fileUrl);
        await prisma.medicalPhoto.delete({ where: { id: photo.id } });
      }
    }
  }

  const uploadedPhotos = [];
  const baseUploadDir = path.join(process.cwd(), 'public', 'uploads', 'emr');
  const visitDir = path.join(baseUploadDir, `patient_${patientId}`, `visit_${visitId}`);
  await mkdir(visitDir, { recursive: true });

  for (const file of files) {
    const compressedBuffer = await compressImage(file.buffer, file.mimetype);
    const fileExt = path.extname(file.originalname);
    const fileName = `${randomUUID()}${fileExt}`;
    const relativeFilePath = `uploads/emr/patient_${patientId}/visit_${visitId}/${fileName}`;
    const absoluteFilePath = path.join(process.cwd(), 'public', relativeFilePath);
    await writeFile(absoluteFilePath, compressedBuffer);
    const fileUrl = `/${relativeFilePath}`;
    const photo = await prisma.medicalPhoto.create({
      data: {
        visitId: updatedVisit.id,
        fileUrl,
        fileName: file.originalname,
      },
    });
    uploadedPhotos.push(photo);
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