// app/api/cron/followup/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { addAuditLog } from '@/lib/services/audit.service' 

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * @openapi
 * /api/cron/followup:
 *   get:
 *     summary: Kirim email follow-up otomatis (cron job)
 *     description: Dipanggil oleh cron-job.org setiap hari. Mengirim email pengingat H-1 kepada pasien yang memiliki jadwal follow-up besok.
 *     tags: [Cron]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token rahasia untuk otorisasi cron (CRON_SECRET_TOKEN)
 *     responses:
 *       200:
 *         description: Proses pengiriman selesai
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 sent:
 *                   type: integer
 *                 failed:
 *                   type: integer
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Token tidak valid
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  
  if (token !== process.env.CRON_SECRET_TOKEN) {
    console.error('[CRON] Invalid token attempt')
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const visits = await prisma.medicalVisit.findMany({
    where: {
      followUpDate: {
        gte: tomorrow,
        lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
      },
    },
    include: {
      patient: true,
      queue: true,
    },
  })

  console.log(`[CRON] Found ${visits.length} patients with follow-up tomorrow`)

  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (const visit of visits) {
    const patientEmail = visit.patient.email
    if (!patientEmail) {
      console.warn(`[CRON] Patient ${visit.patient.id} has no email, skipping`)
      failed++
      errors.push(`Patient ${visit.patient.id} no email`)
      continue
    }

    const followUpDateFormatted = visit.followUpDate 
      ? new Date(visit.followUpDate).toLocaleDateString('id-ID', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : 'tanggal yang telah ditentukan'

    try {
      const { error } = await resend.emails.send({
        from: 'Salsa Dental Clinic <noreply@salsadental.com>',
        to: [patientEmail],
        subject: 'Reminder Jadwal Kontrol Gigi - Salsa Dental Clinic',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fdf8f6; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://salsadental.vercel.app/logo.png" alt="Salsa Dental Clinic" style="max-width: 150px;">
            </div>
            <h2 style="color: #b8868b; text-align: center;">Pengingat Jadwal Kontrol</h2>
            <p>Halo <strong>${visit.patient.name}</strong>,</p>
            <p>Ini adalah pengingat bahwa besok (${followUpDateFormatted}) Anda dijadwalkan untuk kontrol ulang di <strong>Salsa Dental Clinic</strong>.</p>
            <p>Mohon datang 10-15 menit lebih awal. Jika ada perubahan jadwal, silakan hubungi klinik.</p>
            <hr style="margin: 20px 0; border-color: #e8d4d0;">
            <p style="font-size: 12px; color: #8b7370; text-align: center;">
              Salsa Dental Clinic<br>
              📞 (021) 1234 5678 | 🌐 www.salsadental.com
            </p>
          </div>
        `,
      })

      if (error) throw new Error(error.message)

      sent++
      console.log(`[CRON] Email sent to ${patientEmail} for visit ${visit.id}`)
    } catch (err: any) {
      failed++
      const errorMsg = `Failed for visit ${visit.id}: ${err.message}`
      errors.push(errorMsg)
      console.error(`[CRON] ${errorMsg}`)
    }
  }

  await addAuditLog(
    'system',                                   
    'CRON_FOLLOWUP',                            
    'cron_job',                                 
    new Date().toISOString().split('T')[0],     
    { sent, failed, errors, totalVisits: visits.length },
    request.headers.get('x-forwarded-for') || 'cron-job.org'
  ).catch(err => console.error('[CRON] Failed to write audit log:', err))

  return NextResponse.json({
    success: true,
    message: 'Follow-up emails processed',
    sent,
    failed,
    errors: errors.length > 0 ? errors : undefined,
  })
}