import type { MetadataRoute } from 'next'

/**
 * Served at /manifest.webmanifest by Next.js. Only the patient PWA is
 * installable; start_url points at the splash route that checks the session.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Salsa Dental — Portal Pasien',
    short_name: 'Salsa Dental',
    description:
      'Rekam medis, jadwal kontrol, dan antrean Salsabila Dental Clinic dalam satu aplikasi pasien.',
    start_url: '/pasien',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FAF7F5',
    theme_color: '#D08080',
    lang: 'id',
    categories: ['health', 'medical'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
