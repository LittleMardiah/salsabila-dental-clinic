export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePatientSession } from '@/lib/portal-auth'
import { getDriveClientForAdmin } from '@/lib/googleDrive'
import { safeImageMimeType, secureImageHeaders } from '@/lib/secure-image'

const PHOTO_ID_PATTERN = /^[1-9]\d{0,9}$/
const DRIVE_FILE_ID_PATTERN = /^[A-Za-z0-9_-]{10,200}$/

/**
 * Patient-scoped photo proxy. The admin proxy (/api/drive/image/[fileId]) stays
 * admin-only; this route first proves the photo belongs to the session patient.
 */
export async function GET(request: Request, { params }: { params: { photoId: string } }) {
  const auth = await requirePatientSession(request)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  // Exact digits only: Number.parseInt would silently accept "12abc" as 12.
  if (!PHOTO_ID_PATTERN.test(params.photoId)) {
    return NextResponse.json({ error: 'Foto tidak ditemukan' }, { status: 404 })
  }
  const photoId = Number(params.photoId)
  if (!Number.isSafeInteger(photoId)) {
    return NextResponse.json({ error: 'Foto tidak ditemukan' }, { status: 404 })
  }

  // The patientId comes exclusively from the verified session. A photo from
  // another patient's visit resolves to null and therefore 404, not 403, so the
  // response does not confirm that the ID exists.
  const photo = await prisma.medicalPhoto.findFirst({
    where: { id: photoId, visit: { patientId: auth.session.patientId } },
    select: { fileId: true },
  })
  if (!photo?.fileId || !DRIVE_FILE_ID_PATTERN.test(photo.fileId)) {
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
    return NextResponse.json({ error: 'Foto belum dapat ditampilkan' }, { status: 503 })
  }

  try {
    const drive = await getDriveClientForAdmin(preference.adminId)
    const response = await drive.files.get(
      { fileId: photo.fileId, alt: 'media' },
      { responseType: 'stream' }
    )

    const contentType = safeImageMimeType(response.headers?.['content-type'])
    if (!contentType) {
      const stream = response.data as { destroy?: () => void } | undefined
      stream?.destroy?.()
      console.error('[portal photo proxy] upstream mengembalikan tipe konten yang tidak diizinkan')
      return NextResponse.json({ error: 'Foto gagal dimuat' }, { status: 502 })
    }

    return new NextResponse(response.data as never, {
      headers: secureImageHeaders(contentType),
    })
  } catch (error) {
    // Log only a short message server-side; never send upstream/OAuth details,
    // Drive URLs, or stack traces to the patient.
    const message = error instanceof Error ? error.message : 'unknown error'
    console.error('[portal photo proxy] gagal memuat foto:', message)
    return NextResponse.json({ error: 'Foto gagal dimuat' }, { status: 502 })
  }
}
