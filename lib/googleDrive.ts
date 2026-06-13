import { google } from 'googleapis'
import { Readable } from 'stream'

// Inisialisasi auth dengan Service Account
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/drive.file'],
})

const drive = google.drive({ version: 'v3', auth })

/**
 * Upload file ke Google Drive
 * @param fileBuffer - Buffer file
 * @param fileName - Nama file
 * @param mimeType - Tipe MIME
 * @param parentFolderId - ID folder parent (opsional)
 * @returns Promise<{ fileId: string; webViewLink: string }>
 */
export async function uploadFileToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  parentFolderId?: string
) {
  const fileMetadata: any = {
    name: fileName,
    parents: parentFolderId ? [parentFolderId] : ['root'],
  }
  const media = {
    mimeType,
    body: Readable.from(fileBuffer),
  }
  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, webViewLink',
  })
  return {
    fileId: response.data.id!,
    webViewLink: response.data.webViewLink!,
  }
}

/**
 * Hapus file dari Google Drive
 * @param fileId - ID file
 */
export async function deleteFileFromDrive(fileId: string) {
  await drive.files.delete({ fileId })
}

/**
 * Dapatkan URL file (webViewLink) yang bisa diakses publik.
 * Catatan: File yang diupload dengan service account tidak otomatis publik,
 * jadi kita perlu membuat permission 'anyone' agar bisa diakses.
 * @param fileId - ID file
 * @returns Promise<string> - URL yang bisa diakses publik
 */
export async function getFileUrl(fileId: string): Promise<string> {
  // Cek apakah sudah ada permission 'anyone' untuk file ini (opsional, skip untuk simplicty)
  // Buat permission agar dapat diakses publik
  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        type: 'anyone',
        role: 'reader',
        allowFileDiscovery: false,
      },
    })
  } catch (err: any) {
    // Jika permission sudah ada, abaikan error duplicate
    if (!err.message?.includes('duplicate')) {
      console.error('Failed to create permission for file:', fileId, err)
    }
  }
  // Dapatkan webViewLink
  const file = await drive.files.get({ fileId, fields: 'webViewLink' })
  return file.data.webViewLink!
}

/**
 * Membuat folder di Google Drive
 * @param folderName - Nama folder
 * @param parentFolderId - ID folder induk (opsional)
 * @returns Promise<string> - ID folder yang dibuat
 */
export async function createFolder(folderName: string, parentFolderId?: string): Promise<string> {
  const fileMetadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentFolderId ? [parentFolderId] : ['root'],
  }
  const folder = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id',
  })
  return folder.data.id!
}

/**
 * Mendapatkan ID folder, jika belum ada maka buat
 * @param parentId - ID folder induk
 * @param folderName - Nama folder
 * @returns Promise<string> - ID folder
 */
async function getOrCreateFolder(parentId: string | undefined, folderName: string): Promise<string> {
  const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentId ? ` and '${parentId}' in parents` : ''}`;
  const res = await drive.files.list({
    q: query,
    fields: 'files(id)',
    pageSize: 1,
  });
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }
  return await createFolder(folderName, parentId);
}

/**
 * Membuat atau mendapatkan folder untuk menyimpan foto EMR
 * Struktur: SalsaDental/EMR/patient_{patientId}/visit_{visitId}
 * @param patientId - ID pasien
 * @param visitId - ID kunjungan
 * @returns Promise<string> - ID folder visit
 */
export async function getOrCreateEmrFolder(patientId: number, visitId: number): Promise<string> {
  // Root folder: "SalsaDental"
  const rootFolderId = await getOrCreateFolder(undefined, 'SalsaDental');
  // Sub folder: "EMR"
  const emrFolderId = await getOrCreateFolder(rootFolderId, 'EMR');
  // Sub folder: "patient_{patientId}"
  const patientFolderId = await getOrCreateFolder(emrFolderId, `patient_${patientId}`);
  // Sub folder: "visit_{visitId}"
  const visitFolderId = await getOrCreateFolder(patientFolderId, `visit_${visitId}`);
  return visitFolderId;
}