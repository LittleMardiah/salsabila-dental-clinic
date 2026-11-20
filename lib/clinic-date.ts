/**
 * All clinic-facing "today" calculations use Asia/Jakarta, independent of the
 * timezone of the machine running the app (Vercel runs in UTC).
 *
 * Queue.date and DailyReconciliation.date are DATE columns, so they are
 * represented as UTC midnight. Timestamp comparisons use the real instant
 * boundaries of the Jakarta day (UTC+7, no DST).
 */
export const CLINIC_TIMEZONE = 'Asia/Jakarta'
export const CLINIC_UTC_OFFSET = '+07:00'

export function clinicDateString(value: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value)
  const part = (type: string) => parts.find((item) => item.type === type)?.value || ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

/** UTC-midnight Date for a DATE column, defaulting to today in Jakarta. */
export function clinicDateOnly(value: Date = new Date()): Date {
  return new Date(`${clinicDateString(value)}T00:00:00.000Z`)
}

/** Parse a YYYY-MM-DD value into the UTC-midnight representation of a DATE column. */
export function dateOnlyFromInput(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`)
}

export function addDays(dateOnly: Date, days: number): Date {
  const next = new Date(dateOnly)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

/** Inclusive start / exclusive end instants for a Jakarta calendar day. */
export function clinicDayRange(value: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(`${clinicDateString(value)}T00:00:00${CLINIC_UTC_OFFSET}`)
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) }
}

export function clinicDayRangeFromInput(value: string): { start: Date; end: Date } {
  const start = new Date(`${value.slice(0, 10)}T00:00:00${CLINIC_UTC_OFFSET}`)
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) }
}
