import { z } from 'zod'

const POSITIVE_INT_PATTERN = /^\d{1,10}$/
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Accept only canonical positive integer IDs (rejects "12abc", "1.5", "-3"). */
export function parsePositiveIntParam(
  value: string | null | undefined,
  max = 2_147_483_647
): number | null {
  if (!value || !POSITIVE_INT_PATTERN.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= max ? parsed : null
}

/** Validate a YYYY-MM-DD string and reject dates that roll over (e.g. 2026-02-31). */
export function isValidDateOnly(value: string): boolean {
  if (!DATE_ONLY_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** Normalize a WhatsApp number to digits/optional leading plus, then bound it. */
export const phoneInputSchema = z
  .string()
  .trim()
  .min(8, 'Nomor WhatsApp minimal 8 digit')
  .max(20, 'Nomor WhatsApp terlalu panjang')
  .transform((value) => value.replace(/[\s().-]/g, ''))
  .refine((value) => /^\+?\d{8,15}$/.test(value), 'Nomor WhatsApp tidak valid')

export const emailInputSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Email terlalu panjang')
  .email('Format email tidak valid')

export const dateOnlyInputSchema = z
  .string()
  .trim()
  .refine(isValidDateOnly, 'Tanggal tidak valid')
