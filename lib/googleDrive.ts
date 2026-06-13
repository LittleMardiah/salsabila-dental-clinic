import { google } from 'googleapis'
import { Readable } from 'stream'

let auth: any = null;

function getGoogleAuth() {
  if (auth) return auth;

  // Coba dari GOOGLE_CREDENTIALS_BASE64 dulu
  const base64Credentials = process.env.GOOGLE_CREDENTIALS_BASE64;
  if (base64Credentials) {
    try {
      const credentialsJsonString = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      const credentials = JSON.parse(credentialsJsonString);
      auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });
      console.log('[GoogleDrive] Auth using GOOGLE_CREDENTIALS_BASE64');
      return auth;
    } catch (err) {
      console.error('[GoogleDrive] Failed to parse GOOGLE_CREDENTIALS_BASE64, falling back to legacy vars', err);
    }
  }

  // Fallback ke variable lama (untuk backward compatibility)
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    console.error('[GoogleDrive] ERROR: GOOGLE_SERVICE_ACCOUNT_EMAIL is not set');
  }
  if (!process.env.GOOGLE_PRIVATE_KEY) {
    console.error('[GoogleDrive] ERROR: GOOGLE_PRIVATE_KEY is not set');
  }

  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
  privateKey = privateKey.replace(/^"|"$/g, '');
  privateKey = privateKey.replace(/\\n/g, '\n');

  auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  console.log('[GoogleDrive] Auth using legacy GOOGLE_SERVICE_ACCOUNT_EMAIL/KEY');
  return auth;
}

// Inisialisasi drive instance (akan dibuat ulang oleh getDriveInstance)
let drive: any = null;

async function getDriveInstance() {
  if (drive) return drive;
  const authInstance = getGoogleAuth();
  drive = google.drive({ version: 'v3', auth: authInstance });
  return drive;
}

export async function testDriveConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const driveInstance = await getDriveInstance();
    const res = await driveInstance.files.list({
      pageSize: 1,
      fields: 'files(id, name)',
    });
    console.log('[GoogleDrive] Connection test successful');
    return { success: true };
  } catch (err: any) {
    console.error('[GoogleDrive] Connection test failed:', err.message);
    if (err.message && err.message.includes('DECODER routines')) {
      console.error('[GoogleDrive] DECODER error indicates corrupted private key format.');
    }
    return { success: false, error: err.message };
  }
}

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
  const driveInstance = await getDriveInstance();
  const fileMetadata: any = {
    name: fileName,
    parents: parentFolderId ? [parentFolderId] : ['root'],
  }
  const media = {
    mimeType,
    body: Readable.from(fileBuffer),
  }
  console.log(`[GoogleDrive] Uploading file: ${fileName} to folder: ${parentFolderId || 'root'}`);
  const response = await driveInstance.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, webViewLink',
  })
  console.log(`[GoogleDrive] Upload success, fileId: ${response.data.id}`);
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
  const driveInstance = await getDriveInstance();
  console.log(`[GoogleDrive] Deleting file: ${fileId}`);
  await driveInstance.files.delete({ fileId })
  console.log(`[GoogleDrive] Deleted file: ${fileId}`);
}

/**
 * Dapatkan URL file (webViewLink) yang bisa diakses publik.
 * @param fileId - ID file
 * @returns Promise<string> - URL yang bisa diakses publik
 */
export async function getFileUrl(fileId: string): Promise<string> {
  const driveInstance = await getDriveInstance();
  try {
    console.log(`[GoogleDrive] Creating public permission for file: ${fileId}`);
    await driveInstance.permissions.create({
      fileId,
      requestBody: {
        type: 'anyone',
        role: 'reader',
        allowFileDiscovery: false,
      },
    })
  } catch (err: any) {
    if (!err.message?.includes('duplicate')) {
      console.error('[GoogleDrive] Failed to create permission for file:', fileId, err)
    } else {
      console.log(`[GoogleDrive] Permission already exists for file: ${fileId}`);
    }
  }
  const file = await driveInstance.files.get({ fileId, fields: 'webViewLink' })
  return file.data.webViewLink!
}

/**
 * Membuat folder di Google Drive
 * @param folderName - Nama folder
 * @param parentFolderId - ID folder induk (opsional)
 * @returns Promise<string> - ID folder yang dibuat
 */
export async function createFolder(folderName: string, parentFolderId?: string): Promise<string> {
  const driveInstance = await getDriveInstance();
  console.log(`[GoogleDrive] Creating folder: ${folderName} under ${parentFolderId || 'root'}`);
  const fileMetadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentFolderId ? [parentFolderId] : ['root'],
  }
  const folder = await driveInstance.files.create({
    requestBody: fileMetadata,
    fields: 'id',
  })
  console.log(`[GoogleDrive] Folder created, id: ${folder.data.id}`);
  return folder.data.id!
}

/**
 * Mendapatkan ID folder, jika belum ada maka buat
 * @param parentId - ID folder induk
 * @param folderName - Nama folder
 * @returns Promise<string> - ID folder
 */
async function getOrCreateFolder(parentId: string | undefined, folderName: string): Promise<string> {
  const driveInstance = await getDriveInstance();
  const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentId ? ` and '${parentId}' in parents` : ''}`;
  console.log(`[GoogleDrive] Looking for folder: ${folderName} with query: ${query}`);
  const res = await driveInstance.files.list({
    q: query,
    fields: 'files(id)',
    pageSize: 1,
  });
  if (res.data.files && res.data.files.length > 0) {
    const folderId = res.data.files[0].id!;
    console.log(`[GoogleDrive] Folder found: ${folderName} -> ${folderId}`);
    return folderId;
  }
  console.log(`[GoogleDrive] Folder not found, creating: ${folderName}`);
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
  console.log(`[GoogleDrive] Getting/Creating EMR folder for patient ${patientId}, visit ${visitId}`);
  const rootFolderId = await getOrCreateFolder(undefined, 'SalsaDental');
  const emrFolderId = await getOrCreateFolder(rootFolderId, 'EMR');
  const patientFolderId = await getOrCreateFolder(emrFolderId, `patient_${patientId}`);
  const visitFolderId = await getOrCreateFolder(patientFolderId, `visit_${visitId}`);
  console.log(`[GoogleDrive] Final folder ID: ${visitFolderId}`);
  return visitFolderId;
}