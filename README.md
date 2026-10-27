# Salsabila Dental Clinic

Aplikasi manajemen klinik gigi berbasis web untuk mengelola antrian, rekam medis elektronik, keuangan, dan portal pasien dalam satu platform.

Live demo: https://salsabila-dental-clinic.vercel.app/

---

## Tentang

Klinik gigi skala kecil umumnya masih mencatat antrian, rekam medis, dan keuangan secara manual. Ini menyebabkan pasien tidak tahu estimasi waktu tunggu, rekam medis mudah hilang, dan rekonsiliasi keuangan memakan waktu.

Salsabila Dental Clinic menyatukan semuanya dalam satu aplikasi. Pasien dapat memantau antrian dari rumah, admin dapat mengelola klinik dari satu dashboard, dan pemilik dapat melihat performa klinik tanpa rekap manual.

Project ini dibangun sebagai portofolio Software Engineer, dengan fokus pada arsitektur yang scalable, keamanan berlapis, dan pengalaman pengguna yang premium.

---

## Fitur Utama

**Admin**

- Dashboard ringkasan antrian, pasien, dan pendapatan
- Manajemen antrian: panggil pasien, tandai selesai
- Rekam medis elektronik dengan unggah foto kondisi gigi
- Manajemen keuangan dan rekonsiliasi harian
- Audit log untuk setiap aksi
- Backup dan restore database ke cloud

**Pasien**

- Cek status antrian dengan kode unik
- Notifikasi push saat giliran mendekat
- Riwayat perawatan

---

## Tech Stack

- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Backend: Next.js API Routes, Prisma ORM
- Database: PostgreSQL (Supabase)
- Auth: JWT, bcrypt, Next.js Middleware
- Storage: Google Drive API, Supabase Storage
- Deployment: Vercel, GitHub Actions

---

## Arsitektur Singkat

Landing page, admin dashboard, dan portal pasien semuanya dilayani oleh satu aplikasi Next.js. Middleware memvalidasi JWT di Edge runtime sebelum request mencapai API admin. Data disimpan di PostgreSQL via Prisma. Foto EMR dan bukti transfer diunggah ke Google Drive melalui OAuth2.

Autentikasi admin menggunakan dua lapis: kode akses 8 digit, lalu username dan password yang diverifikasi dengan bcrypt. Pasien login dengan kode 6 digit yang dipetakan ke satu antrian spesifik.

---

## Cara Menjalankan

```bash
git clone https://github.com/LittleMardiah/salsabila-dental-clinic.git
cd salsabila-dental-clinic
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run dev
Environment variable wajib: DATABASE_URL, DIRECT_URL, JWT_SECRET.

Catatan: jika menggunakan WSL, jalankan semua perintah npm di dalam WSL, bukan di Windows. Native module bcrypt dan Prisma engine bersifat OS-specific.

Struktur Project
text
app/          Halaman dan API routes
components/   Komponen UI reusable
lib/          Auth, Prisma client, services
prisma/       Schema dan seed
tests/        Unit dan integration test
Yang Saya Pelajari
Pemisahan runtime Edge dan Node di Next.js untuk middleware dan auth

Native module (bcrypt, Prisma engine) harus konsisten dengan OS

Rate limiting untuk endpoint login publik

Integrasi Google Drive untuk penyimpanan file dinamis

Author
Arif

Email: m.arif250602@gmail.com

GitHub: https://github.com/LittleMardiah
