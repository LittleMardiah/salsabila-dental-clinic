import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { Rethink_Sans } from 'next/font/google';
import { Toaster } from "@/components/ui/sonner";
import Providers from './providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
});

const rethink = Rethink_Sans({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-rethink',
});

export const metadata: Metadata = {
  title: 'Salsabila Dental Clinic',
  description: 'Aplikasi Manajemen Klinik Gigi',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} ${poppins.variable} ${rethink.variable} h-full antialiased`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
        </Providers>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}