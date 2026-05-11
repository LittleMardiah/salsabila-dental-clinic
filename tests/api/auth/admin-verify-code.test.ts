import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/admin/verify-code/route';

const originalEnv = process.env;
beforeEach(() => {
  process.env = { ...originalEnv, ADMIN_ACCESS_CODE: '12345678' };
});
afterEach(() => {
  process.env = originalEnv;
});

function createNextRequest(body: any, ip?: string): NextRequest {
  const url = 'http://localhost:3000/api/auth/admin/verify-code';
  const headers = new Headers();
  if (ip) {
    headers.set('x-forwarded-for', ip);
  }
  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/admin/verify-code', () => {
  test('TC-01: Kode benar → 200 + cookie', async () => {
    const req = createNextRequest({ code: '12345678' });
    const response = await POST(req);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.message).toBe('Kode valid, silakan login');
    
    const cookieHeader = response.headers.get('set-cookie');
    expect(cookieHeader).toContain('admin_code_verified=true');
    expect(cookieHeader).toContain('Max-Age=300');
  });

  test('TC-02: Kode salah → 401', async () => {
    const req = createNextRequest({ code: '00000000' });
    const response = await POST(req);
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('Invalid access code');
  });

  test('Rate limit: lebih dari 5 attempt → 429', async () => {
    // Reset rate limit store sebelum test
    const { resetRateLimitStore } = require('@/lib/rate-limit');
    resetRateLimitStore();
    
    const testIp = '192.168.1.100';
    // Lakukan 6 request dengan IP yang sama
    for (let i = 0; i < 5; i++) {
      const req = createNextRequest({ code: 'wrong' }, testIp);
      const res = await POST(req);
      // 5 pertama harus 401 (kode salah), bukan 429
      expect(res.status).toBe(401);
    }
    // Request ke-6 harus kena rate limit
    const req6 = createNextRequest({ code: 'wrong' }, testIp);
    const res6 = await POST(req6);
    expect(res6.status).toBe(429);
    const json6 = await res6.json();
    expect(json6.success).toBe(false);
    expect(json6.error).toContain('Too many attempts');
  });
});