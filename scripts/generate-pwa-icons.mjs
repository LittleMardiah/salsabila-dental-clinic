// Generates the PWA icons from one Dusty Rose / cream SVG source.
// Run: node scripts/generate-pwa-icons.mjs
import { mkdir } from 'node:fs/promises'
import sharp from 'sharp'

const TOOTH =
  'M256 122c-38 0-72 12-94 34-20 20-28 48-26 82 2 26 10 48 16 74 7 30 10 62 20 84 6 13 14 20 24 20 12 0 18-10 22-26 5-20 8-46 14-62 5-13 12-20 24-20s19 7 24 20c6 16 9 42 14 62 4 16 10 26 22 26 10 0 18-7 24-20 10-22 13-54 20-84 6-26 14-48 16-74 2-34-6-62-26-82-22-22-56-34-94-34z'

function svg({ maskable }) {
  const scale = maskable ? 0.72 : 1
  const offset = (512 * (1 - scale)) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="rose" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#E5A6A6"/>
      <stop offset="0.55" stop-color="#D08080"/>
      <stop offset="1" stop-color="#8B4F4F"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.3" cy="0.2" r="0.8">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="${maskable ? 0 : 112}" fill="url(#rose)"/>
  <rect width="512" height="512" rx="${maskable ? 0 : 112}" fill="url(#glow)"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">
    <path d="${TOOTH}" fill="#FAF7F5"/>
    <path d="M256 122c-38 0-72 12-94 34-20 20-28 48-26 82 2 26 10 48 16 74" fill="none" stroke="#E5A6A6" stroke-opacity="0.55" stroke-width="6" stroke-linecap="round"/>
  </g>
</svg>`
}

await mkdir('public/icons', { recursive: true })

const normal = Buffer.from(svg({ maskable: false }))
const maskable = Buffer.from(svg({ maskable: true }))

await sharp(normal).resize(192, 192).png().toFile('public/icons/icon-192.png')
await sharp(normal).resize(512, 512).png().toFile('public/icons/icon-512.png')
await sharp(maskable).resize(512, 512).png().toFile('public/icons/maskable-512.png')
await sharp(normal).resize(180, 180).png().toFile('public/icons/apple-touch-icon.png')
await sharp(normal).resize(32, 32).png().toFile('public/icons/favicon-32.png')

console.log('PWA icons written to public/icons/')
