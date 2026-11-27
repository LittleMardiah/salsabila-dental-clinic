export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePatientSession } from '@/lib/portal-auth'
import { getDriveClientForAdmin } from '@/lib/googleDrive'

/**
 * Patient-scoped photo proxy. The admin proxy (/api/drive/image/[fileId]) stays
 * admin-only; this route first proves the photo belongs to the session patient.
 */
export async function GET(request: Request, { params }: { params: { photoId: string } }) {
  const auth = await requirePatientSession(request)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const photoId = Number.parseInt(params.photoId, 10)
  if (!Number.isFinite(photoId)) {
    return NextResponse.json({ error: 'Foto tidak valid' }, { status: 400 })
  }

  const photo = await prisma.medicalPhoto.findFirst({
    where: { id: photoId, visit: { patientId: auth.session.patientId } },
    select: { fileId: true },
  })
  if (!photo?.fileId) {
    return NextResponse.json({ error: 'Foto tidak ditemukan' }, { status: 404 })
  }

  // Photos live in the Drive account of whichever admin uploaded them; reuse the
  // most recently connected admin credential.
  const preference = await prisma.adminPreference.findFirst({
    where: { googleRefreshToken: { not: null } },
    orderBy: { updatedAt: 'desc' },
    select: { adminId: true },
  })
  if (!preference) {
    return NextResponse.json({ error: 'Penyimpanan foto belum terhubung' }, { status: 503 })
  }

  try {
    const drive = await getDriveClientForAdmin(preference.adminId)
    const response = await drive.files.get(
      { fileId: photo.fileId, alt: 'media' },
      { responseType: 'stream' }
    )
    const contentType = response.headers['content-type'] || 'image/jpeg'
    return new NextResponse(response.data as never, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('[portal photo proxy] gagal memuat foto:', error)
    return NextResponse.json({ error: 'Foto gagal dimuat' }, { status: 502 })
  }
}
