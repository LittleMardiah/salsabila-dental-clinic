import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export type RateLimitRule = {
  /** Maximum requests allowed inside the window. */
  limit: number
  /** Fixed window length in seconds. */
  windowSeconds: number
}

export type RateLimitDecision = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

type MemoryBucket = { count: number; resetAt: number }

/**
 * Last-resort fallback only. The database table is the source of truth so
 * limits hold across Vercel serverless instances; this map just keeps a burst
 * from becoming completely unthrottled during a transient DB error.
 */
const memoryBuckets = new Map<string, MemoryBucket>()
const MEMORY_MAX_ENTRIES = 2_000

function memoryConsume(key: string, rule: RateLimitRule): RateLimitDecision {
  const now = Date.now()
  const resetAt = now + rule.windowSeconds * 1000

  if (memoryBuckets.size > MEMORY_MAX_ENTRIES) {
    for (const [entryKey, entry] of memoryBuckets) {
      if (entry.resetAt <= now) memoryBuckets.delete(entryKey)
    }
  }

  const bucket = memoryBuckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: rule.limit - 1, retryAfterSeconds: rule.windowSeconds }
  }

  bucket.count += 1
  return {
    allowed: bucket.count <= rule.limit,
    remaining: Math.max(0, rule.limit - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  }
}

/**
 * Atomically increments a fixed-window bucket in Postgres. Safe when several
 * serverless invocations handle the same client at once.
 */
export async function consumeRateLimit(key: string, rule: RateLimitRule): Promise<RateLimitDecision> {
  const now = Date.now()
  const windowMs = rule.windowSeconds * 1000
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs)
  const expiresAt = new Date(windowStart.getTime() + windowMs)

  try {
    const bucket = await prisma.rateLimitBucket.upsert({
      where: { key_windowStart: { key, windowStart } },
      create: { key, windowStart, count: 1, expiresAt },
      update: { count: { increment: 1 } },
      select: { count: true },
    })

    // Opportunistic cleanup; bounded so it never turns into a full-table scan
    // on the hot path.
    if (Math.random() < 0.01) {
      await prisma.rateLimitBucket
        .deleteMany({ where: { expiresAt: { lt: new Date(now - 60_000) } } })
        .catch(() => undefined)
    }

    return {
      allowed: bucket.count <= rule.limit,
      remaining: Math.max(0, rule.limit - bucket.count),
      retryAfterSeconds: Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)),
    }
  } catch (error) {
    console.error('[rate-limit] penyimpanan database tidak tersedia, memakai fallback memori:', error)
    return memoryConsume(key, rule)
  }
}

/** 429 response that never reveals whether an account exists. */
export function tooManyRequests(decision: RateLimitDecision): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Terlalu banyak percobaan. Silakan coba lagi beberapa saat lagi.',
    },
    {
      status: 429,
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': String(decision.retryAfterSeconds),
      },
    }
  )
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const candidates = [
    forwarded?.split(',')[0],
    request.headers.get('x-real-ip'),
    request.headers.get('cf-connecting-ip'),
  ]

  for (const candidate of candidates) {
    const value = candidate?.trim()
    if (value) return value.slice(0, 120)
  }
  return 'unknown'
}

/** sha256 prevents raw IPs / e-mails / phone numbers from being stored. */
export function hashRateLimitKey(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function ipRateLimitKey(scope: string, request: Request): string {
  return `patient:${scope}:ip:${hashRateLimitKey(getClientIp(request))}`
}

export function identifierRateLimitKey(scope: string, identifier: string): string {
  const trimmed = identifier.trim().toLowerCase()
  const normalized = trimmed.includes('@') ? trimmed : trimmed.replace(/\D/g, '') || trimmed
  return `patient:${scope}:id:${hashRateLimitKey(normalized)}`
}
