export const WA_DISPLAY = '0813 8753 0407'
export const WA_LINK = 'https://wa.me/6281387530407'

export const FAQ_ITEMS = [
  {
    num: '01',
    question: 'Bagaimana cara mendapatkan kode token untuk memantau antrean?',
    answer:
      'Setelah pendaftaran Anda dicatat oleh staf klinik, sistem menerbitkan kode akses unik 6 karakter (contoh: E4ZEQW). Klik "Ambil Antrian Sekarang" lalu masukkan kode tersebut untuk memantau posisi antrean secara langsung.',
  },
  {
    num: '02',
    question: 'Apakah saya harus menunggu di ruang tunggu klinik sejak awal sesi?',
    answer:
      'Tidak perlu. Pantau pergerakan nomor antrean melalui ponsel Anda dan hadir menjelang giliran Anda dipanggil sehingga kenyamanan dan privasi Anda tetap terjaga.',
  },
  {
    num: '03',
    question: 'Bagaimana jika kode token belum diterima atau perlu bantuan penjadwalan?',
    answer:
      'Klik tombol "Butuh Bantuan?" di pojok kanan bawah atau hubungi WhatsApp resmi klinik di 0813 8753 0407 untuk terhubung langsung dengan resepsionis.',
  },
  {
    num: '04',
    question: 'Seperti apa standar sterilisasi dan kenyamanan di Salsabila Dental Clinic?',
    answer:
      'Setiap instrumen melalui protokol sterilisasi klinis penuh antar-pasien, dipadukan tata ruang tenang bernuansa Dusty Rose untuk meredakan rasa cemas sebelum perawatan.',
  },
]

export type ThemeTokens = ReturnType<typeof getTheme>

export function getTheme(darkMode: boolean) {
  return darkMode
    ? {
        bg: 'bg-[#120E0F]',
        text: 'text-[#F6EFEA]',
        textMuted: 'text-[#C2AEB0]',
        textSubtle: 'text-[#8C7577]',
        hairline: 'border-[#F6EFEA]/[0.09]',
        divideHairline: 'divide-[#F6EFEA]/[0.09]',
        roseAccent: 'text-[#E5A6A6]',
        roseLabel: 'text-[#D08080]',
        elevatedCard:
          'bg-gradient-to-b from-[#21181B] to-[#171113] border-[#F6EFEA]/[0.11] shadow-[0_18px_40px_-16px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.06)]',
        pillSurface:
          'bg-[#1D1518] border-[#D08080]/30 text-[#F6EFEA] shadow-[0_6px_18px_-8px_rgba(0,0,0,0.6)]',
        solidPanel:
          'bg-[#1C1417] border-[#D08080]/35 text-[#F6EFEA] shadow-[0_24px_60px_-15px_rgba(0,0,0,0.85)]',
        inputBg: 'bg-[#140F11] border-[#D08080]/35 text-[#F6EFEA]',
        isDark: true,
      }
    : {
        bg: 'bg-[#FAF7F5]',
        text: 'text-[#221A1B]',
        textMuted: 'text-[#6A5557]',
        textSubtle: 'text-[#968082]',
        hairline: 'border-[#221A1B]/[0.08]',
        divideHairline: 'divide-[#221A1B]/[0.08]',
        roseAccent: 'text-[#8B4F4F]',
        roseLabel: 'text-[#B86868]',
        elevatedCard:
          'bg-gradient-to-b from-white to-[#FDF8F7] border-[#D08080]/22 shadow-[0_16px_36px_-16px_rgba(139,79,79,0.16),inset_0_1px_0_rgba(255,255,255,0.95)]',
        pillSurface:
          'bg-white border-[#D08080]/35 text-[#221A1B] shadow-[0_6px_18px_-8px_rgba(139,79,79,0.14)]',
        solidPanel:
          'bg-[#FFFDFC] border-[#D08080]/40 text-[#221A1B] shadow-[0_24px_60px_-15px_rgba(95,48,48,0.28)]',
        inputBg: 'bg-[#FFFDFC] border-[#D08080]/40 text-[#221A1B]',
        isDark: false,
      }
}

export function formatRupiah(value: number | string | null | undefined) {
  const num =
    typeof value === 'string'
      ? parseInt(value.replace(/\D/g, '') || '0', 10)
      : Math.round(Number(value) || 0)
  return `Rp ${num.toLocaleString('id-ID')}`
}

export function formatDateID(value: string | Date | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function formatQueueNumber(num: number | string | null | undefined) {
  const parsed = typeof num === 'string' ? parseInt(num, 10) : Number(num)
  if (!parsed || Number.isNaN(parsed)) return 'A-00'
  return `A-${parsed.toString().padStart(2, '0')}`
}

/* ----------------------------------------------------------------------------
   Odontogram persistence
   MedicalVisit has no dedicated odontogram column, so the chart is embedded in
   `catatanTambahan` behind a unique marker. It survives backups/restores and
   round-trips through the real EMR API without altering the database schema.
---------------------------------------------------------------------------- */
export const ODONTO_MARKER = '\n\n[[ODONTOGRAM:v1]]'

export type ToothMark = { color: string; label: string }
export type TeethQuadrants = {
  ur: string[]
  ul: string[]
  lr: string[]
  ll: string[]
}

export type OdontogramPayload = {
  marks: Record<string, ToothMark>
  quadrants: TeethQuadrants
  legend: { id: string; label: string; color: string }[]
}

export const DEFAULT_TEETH_QUADRANTS: TeethQuadrants = {
  ur: ['18', '17', '16', '15', '14', '13', '12', '11'],
  ul: ['21', '22', '23', '24', '25', '26', '27', '28'],
  lr: ['48', '47', '46', '45', '44', '43', '42', '41'],
  ll: ['31', '32', '33', '34', '35', '36', '37', '38'],
}

export const DEFAULT_LEGEND = [
  { id: 'caries', label: 'Karies', color: '#EAB308' },
  { id: 'filling', label: 'Tambalan', color: '#3B82F6' },
  { id: 'rct', label: 'Root Canal', color: '#92400E' },
  { id: 'extract', label: 'Cabut / Hilang', color: '#EF4444' },
]

export function embedOdontogram(notes: string, payload: OdontogramPayload) {
  const clean = stripOdontogram(notes).trimEnd()
  return `${clean}${ODONTO_MARKER}${JSON.stringify(payload)}`
}

export function stripOdontogram(notes: string | null | undefined): string {
  if (!notes) return ''
  const index = notes.indexOf(ODONTO_MARKER)
  return (index === -1 ? notes : notes.slice(0, index)).trim()
}

export function parseOdontogram(notes: string | null | undefined): OdontogramPayload | null {
  if (!notes) return null
  const index = notes.indexOf(ODONTO_MARKER)
  if (index === -1) return null
  try {
    const parsed = JSON.parse(notes.slice(index + ODONTO_MARKER.length))
    if (!parsed || typeof parsed !== 'object') return null
    return {
      marks: parsed.marks && typeof parsed.marks === 'object' ? parsed.marks : {},
      quadrants:
        parsed.quadrants && typeof parsed.quadrants === 'object'
          ? parsed.quadrants
          : DEFAULT_TEETH_QUADRANTS,
      // An intentionally empty legend (all templates removed) must stay empty.
      legend: Array.isArray(parsed.legend) ? parsed.legend : DEFAULT_LEGEND,
    }
  } catch {
    return null
  }
}
