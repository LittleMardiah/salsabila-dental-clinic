/**
 * Kontrak autentikasi admin dua lapis.
 *
 * Token admin hanya boleh dianggap valid jika diterbitkan setelah Layer 1
 * (vault) dan Layer 2 (kredensial) sama-sama berhasil diverifikasi.
 */

export const ADMIN_AUTH_LEVEL = 2

export const DEFAULT_ADMIN_USERNAME = 'admin'

// Local-development convenience only. Production must provide
// ADMIN_ACCESS_CODE explicitly; a missing secret fails closed.
export const DEFAULT_ADMIN_ACCESS_CODE = '18052506'

export function resolveAdminAccessCode(): string | null {
  const configured = process.env.ADMIN_ACCESS_CODE?.trim()
  if (configured) return configured
  return process.env.NODE_ENV === 'production' ? null : DEFAULT_ADMIN_ACCESS_CODE
}

export type AdminTokenPayload = {
  username: string
  role: 'admin'
  authLevel: typeof ADMIN_AUTH_LEVEL
  iat?: number
  exp?: number
}

export type VaultTokenPayload = {
  role: 'admin_vault'
  scope: 'admin_vault'
  iat?: number
  exp?: number
}

export function isAdminTokenPayload(value: unknown): value is AdminTokenPayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as Record<string, unknown>
  return (
    payload.role === 'admin' &&
    payload.authLevel === ADMIN_AUTH_LEVEL &&
    typeof payload.username === 'string' &&
    payload.username.length > 0
  )
}

export function isVaultTokenPayload(value: unknown): value is VaultTokenPayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as Record<string, unknown>
  return payload.role === 'admin_vault' && payload.scope === 'admin_vault'
}
