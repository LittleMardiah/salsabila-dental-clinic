/** Pure password policy shared by the API routes and the patient forms. */
export function passwordChecks(password: string) {
  return {
    length: password.length >= 8,
    caseMix: /[a-z]/.test(password) && /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  }
}

export type PasswordChecks = ReturnType<typeof passwordChecks>

export function passwordScore(password: string): number {
  return Object.values(passwordChecks(password)).filter(Boolean).length
}

export function isPasswordAcceptable(password: string): boolean {
  const checks = passwordChecks(password)
  const score = Object.values(checks).filter(Boolean).length
  return password.length >= 8 && checks.caseMix && checks.number && score >= 3
}

export function passwordMeta(score: number) {
  return [
    { label: 'Belum Diisi', text: 'text-[var(--pp-muted)]', bar: 'bg-transparent' },
    { label: 'Sangat Lemah', text: 'text-rose-500', bar: 'bg-rose-500' },
    { label: 'Cukup', text: 'text-amber-500', bar: 'bg-amber-400' },
    { label: 'Kuat', text: 'text-sky-500', bar: 'bg-sky-400' },
    { label: 'Sangat Kuat', text: 'text-emerald-500', bar: 'bg-emerald-500' },
  ][Math.max(0, Math.min(4, score))]
}
