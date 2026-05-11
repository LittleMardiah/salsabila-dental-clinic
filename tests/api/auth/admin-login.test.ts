import request from 'supertest'

const baseUrl = 'http://localhost:3000'

async function getVerifiedCookie(): Promise<string> {
  const verifyRes = await request(baseUrl)
    .post('/api/auth/admin/verify-code')
    .send({ code: process.env.ADMIN_ACCESS_CODE || '18052506' })
  
  const setCookieHeader = verifyRes.headers['set-cookie'] || verifyRes.get('Set-Cookie')
  const cookie = Array.isArray(setCookieHeader) 
    ? setCookieHeader.find((c: string) => c.startsWith('admin_code_verified='))
    : undefined
  
  if (!cookie) {
    console.error('Verify response status:', verifyRes.status)
    console.error('Verify response body:', verifyRes.body)
    throw new Error('Failed to get verified cookie - pastikan server berjalan dan kode akses benar')
  }
  return cookie
}

describe('Admin Login Lapis 2 (TC-03, TC-04, TC-05)', () => {
  let verifiedCookie: string

  beforeAll(async () => {
    verifiedCookie = await getVerifiedCookie()
  })

  test('TC-03: Login sukses dengan cookie valid dan kredensial benar', async () => {
    const res = await request(baseUrl)
      .post('/api/auth/admin/login')
      .set('Cookie', verifiedCookie)
      .send({ username: 'admin', password: 'Salsa_1234' })
    
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.message).toMatch(/berhasil/i)
    
    const setCookieHeader = res.headers['set-cookie'] || res.get('Set-Cookie')
    expect(setCookieHeader).toBeDefined()
    
    const tokenCookie = Array.isArray(setCookieHeader) 
      ? setCookieHeader.find((c: string) => c.startsWith('token='))
      : undefined
    expect(tokenCookie).toBeDefined()
    
    const adminCodeCookie = Array.isArray(setCookieHeader)
      ? setCookieHeader.find((c: string) => c.startsWith('admin_code_verified='))
      : undefined
    expect(adminCodeCookie).toBeUndefined()
  })

  test('TC-04: Login tanpa cookie admin_code_verified', async () => {
    const res = await request(baseUrl)
      .post('/api/auth/admin/login')
      .send({ username: 'admin', password: 'Salsa_1234' })
    
    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/verification code required/i)
  })

  test('TC-05: Login dengan password salah', async () => {
    const res = await request(baseUrl)
      .post('/api/auth/admin/login')
      .set('Cookie', verifiedCookie)
      .send({ username: 'admin', password: 'wrongpassword' })
    
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/invalid username or password/i)
  })

  test('TC-05b: Login dengan username salah', async () => {
    const res = await request(baseUrl)
      .post('/api/auth/admin/login')
      .set('Cookie', verifiedCookie)
      .send({ username: 'wronguser', password: 'Salsa_1234' })
    
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/invalid username or password/i)
  })
})