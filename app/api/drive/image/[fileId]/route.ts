// Endpoint proxy untuk menampilkan gambar dari Google Drive tanpa CORS
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/ServerAuth';
import { getDriveClientForAdmin } from '@/lib/googleDrive';
import { safeImageMimeType, secureImageHeaders } from '@/lib/secure-image';

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

    if (!fileId || !/^[A-Za-z0-9_-]{10,200}$/.test(fileId)) {
      return NextResponse.json({ error: 'File ID tidak valid' }, { status: 400 });
    }

    // Dapatkan drive client untuk admin
    const drive = await getDriveClientForAdmin(adminUsername);

    // Download file dari Google Drive dengan alt=media
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    const contentType = safeImageMimeType(response.headers?.['content-type']);
    if (!contentType) {
      const stream = response.data as { destroy?: () => void } | undefined;
      stream?.destroy?.();
      console.error('[Drive Image Proxy] upstream mengembalikan tipe konten yang tidak diizinkan');
      return NextResponse.json({ error: 'Gagal memuat gambar' }, { status: 502 });
    }

    // Kembalikan stream sebagai response. Clinical images must not land in a
    // shared cache, and nosniff/CSP keep a mislabelled file from executing.
    return new NextResponse(response.data as any, {
      headers: secureImageHeaders(contentType),
    });
  } catch (error) {
    // Never echo upstream/OAuth messages to the client.
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error('[Drive Image Proxy] Error:', message);
    return NextResponse.json({ error: 'Gagal memuat gambar' }, { status: 502 });
  }
}