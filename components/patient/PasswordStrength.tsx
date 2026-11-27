'use client'

import { passwordChecks, passwordMeta, passwordScore } from '@/lib/password-policy'

const RULES: { key: keyof ReturnType<typeof passwordChecks>; label: string }[] = [
  { key: 'length', label: 'Min. 8 karakter' },
  { key: 'caseMix', label: 'Huruf besar & kecil' },
  { key: 'number', label: 'Angka' },
  { key: 'symbol', label: 'Simbol' },
]

export default function PasswordStrength({ value }: { value: string }) {
  const checks = passwordChecks(value)
  const score = passwordScore(value)
  const meta = passwordMeta(score)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-[var(--pp-secondary)]">Kekuatan kata sandi</span>
        <span className={`text-[10px] font-semibold ${meta.text}`}>{meta.label}</span>
      </div>

      <div className="flex items-center gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((segment) => (
          <span
            key={segment}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              segment <= score && score > 0 ? meta.bar : 'bg-[var(--pp-soft)]'
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-1 rounded-2xl border border-[var(--pp-hairline)] bg-[var(--pp-elevated)] p-3">
        {RULES.map((rule) => {
          const passed = checks[rule.key]
          return (
            <span
              key={rule.key}
              className={`flex items-center gap-1.5 text-[10px] transition-colors ${
                passed ? 'font-medium text-emerald-600 dark:text-emerald-300' : 'text-[var(--pp-secondary)]'
              }`}
            >
              <span className="font-mono-tech">{passed ? '✓' : '○'}</span>
              {rule.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}
