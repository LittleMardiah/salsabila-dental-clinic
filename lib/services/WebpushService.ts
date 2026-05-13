// lib/services/WebpushService.ts
import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

// Pastikan VAPID keys tersedia
if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.error('VAPID keys missing! Web push tidak akan berfungsi.')
} else {
  webpush.setVapidDetails(
    'mailto:admin@salsadental.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export async function sendNotification(queueId: number, patientName: string, queueNumber: number): Promise<boolean> {
  try {
    console.log(`[sendNotification] Mencari subscription untuk queueId: ${queueId}`)
    const subscription = await prisma.webPushSubscription.findUnique({
      where: { queueId },
    })
    if (!subscription) {
      console.log(`[sendNotification] Tidak ada subscription untuk queue ${queueId}`)
      return false
    }

    const payload = JSON.stringify({
      title: 'Giliran Anda!',
      body: `Pasien ${patientName} dengan antrian #${queueNumber} dipanggil. Silakan masuk.`,
      icon: '/logo.png',  
      badge: '/badge.png',
      vibrate: [200, 100, 200],
    })

    console.log(`[sendNotification] Mengirim notifikasi ke endpoint: ${subscription.endpoint}`)
    const result = await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      payload
    )
    console.log(`[sendNotification] Berhasil untuk queue ${queueId}`, result)
    return true
  } catch (err: any) {
    console.error(`[sendNotification] Gagal untuk queue ${queueId}:`, err.message)
    if (err.statusCode === 410) {
      console.log(`[sendNotification] Menghapus subscription invalid untuk queue ${queueId}`)
      await prisma.webPushSubscription.delete({ where: { queueId } }).catch(e => console.error(e))
    }
    return false
  }
}