import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Salsa Dental — Portal Pasien',
    template: '%s · Salsa Dental',
  },
  description:
    'Portal pasien Salsabila Dental Clinic: rekam medis read-only, peta gigi FDI, jadwal kontrol, dan antrean klinik.',
  applicationName: 'Salsa Dental Patient Portal',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Salsa Dental',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF7F5' },
    { media: '(prefers-color-scheme: dark)', color: '#120E0F' },
  ],
}

export default function PasienLayout({ children }: { children: React.ReactNode }) {
  return children
}
