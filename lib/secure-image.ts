/**
 * Allow only raster types that browsers render safely. SVG is deliberately
 * excluded because it can carry script, and HTML/PDF must never be served from
 * a clinical-photo endpoint.
 */
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/tiff',
  'image/heic',
  'image/heif',
])

/** Returns a canonical allow-listed MIME type, or null for anything else. */
export function safeImageMimeType(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const mime = value.split(';')[0]?.trim().toLowerCase()
  return mime && ALLOWED_IMAGE_MIME_TYPES.has(mime) ? mime : null
}

export function secureImageHeaders(contentType: string): Record<string, string> {
  return {
    'Content-Type': contentType,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Cross-Origin-Resource-Policy': 'same-origin',
  }
}
