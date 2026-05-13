type RateLimitStore = {
  [ip: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}
const WINDOW_MS = 10 * 60 * 1000 // 10 menit
const MAX_ATTEMPTS = 5 // 5 attempt

export function RateLimit(ip: string): { allowed: boolean; remaining: number; resetAfterSeconds: number } {
  const now = Date.now()
  const record = store[ip]

  if (!record || now > record.resetTime) {
    store[ip] = {
      count: 1,
      resetTime: now + WINDOW_MS,
    }
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetAfterSeconds: WINDOW_MS / 1000 }
  }

  record.count += 1
  const remaining = Math.max(0, MAX_ATTEMPTS - record.count)
  const allowed = record.count <= MAX_ATTEMPTS
  const resetAfterSeconds = Math.max(0, Math.ceil((record.resetTime - now) / 1000))

  return { allowed, remaining, resetAfterSeconds }
}

setInterval(() => {
  const now = Date.now()
  for (const ip in store) {
    if (now > store[ip].resetTime) {
      delete store[ip]
    }
  }
}, 60 * 60 * 1000) // setiap 1 jam