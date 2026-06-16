// Endpoint proxy untuk menampilkan gambar dari Google Drive tanpa CORS
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/ServerAuth';
import { getDriveClientForAdmin } from '@/lib/googleDrive';

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    // Verifikasi admin
    const auth = await verifyAdminToken(req);
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUsername = auth.username || 'unknown';
    const { fileId } = await params;

    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    // Dapatkan drive client untuk admin
    const drive = await getDriveClientForAdmin(adminUsername);

    // Download file dari Google Drive dengan alt=media
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    const contentType = response.headers['content-type'] || 'image/jpeg';

    // Kembalikan stream sebagai response
    return new NextResponse(response.data as any, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', 
      },
    });
  } catch (error: any) {
    console.error('[Drive Image Proxy] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch image' },
      { status: 500 }
    );
  }
}