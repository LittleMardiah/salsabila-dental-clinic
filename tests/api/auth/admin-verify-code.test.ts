import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/admin/verify-code/route';

const originalEnv = process.env;
beforeEach(() => {
  process.env = {
    ...originalEnv,
    ADMIN_ACCESS_CODE: '18052506',
    JWT_SECRET: 'auth-test-secret',
  };
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
  test('TC-01: Kode vault benar → 200 + cookie vault bertanda tangan', async () => {
    const req = createNextRequest({ code: '18052506' });
    const response = await POST(req);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.message).toBe('Kode valid, silakan login');

    const cookieHeader = response.headers.get('set-cookie') || '';
    expect(cookieHeader).toContain('admin_code_verified=');
    expect(cookieHeader).toContain('Max-Age=300');
    expect(cookieHeader).toContain('HttpOnly');

    const cookieValue = decodeURIComponent(
      cookieHeader.split(';')[0].split('=').slice(1).join('=')
    );
    const payload = jwt.verify(cookieValue, 'auth-test-secret');
    expect(payload).toMatchObject({ role: 'admin_vault', scope: 'admin_vault' });
    expect(cookieValue).not.toBe('true');
  });

  test('TC-02: Kode salah → 401', async () => {
    const req = createNextRequest({ code: '00000000' });
    const response = await POST(req);
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('Invalid access code');
  });

  test('Kode demo lama 123456 tidak lagi diterima', async () => {
    const req = createNextRequest({ code: '123456' });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  test('Rate limit: lebih dari 5 attempt → 429', async () => {
    const testIp = `192.168.1.${Math.floor(Math.random() * 200) + 1}`;
    for (let i = 0; i < 5; i++) {
      const req = createNextRequest({ code: '00000000' }, testIp);
      const res = await POST(req);
      expect(res.status).toBe(401);
    }
    const req6 = createNextRequest({ code: '00000000' }, testIp);
    const res6 = await POST(req6);
    expect(res6.status).toBe(429);
    const json6 = await res6.json();
    expect(json6.success).toBe(false);
    expect(json6.error).toContain('Too many attempts');
  });
});
