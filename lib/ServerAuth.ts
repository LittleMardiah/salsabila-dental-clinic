// lib/server-auth.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

/**
 * Hash password menggunakan bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verifikasi password dengan hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token (untuk Node.js runtime)
 */
export function generateJWT(payload: object, expiresIn: string = '24h'): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined');
  return jwt.sign(payload, secret, { expiresIn } as any);
}

/**
 * Verifikasi JWT token (untuk Node.js runtime)
 */
export function verifyJWT(token: string): any {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined');
  return jwt.verify(token, secret);
}

/**
 * Verifikasi token admin dari cookie request (untuk API routes Node.js)
 */
export async function verifyAdminToken(request: Request): Promise<{ valid: boolean; error?: string; status?: number; username?: string }> {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map(c => {
      const [key, ...rest] = c.split('=');
      return [key, rest.join('=')];
    })
  );
  const token = cookies.token;
  if (!token) return { valid: false, error: 'No token', status: 401 };
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.role !== 'admin') return { valid: false, error: 'Forbidden', status: 403 };
    return { valid: true, username: decoded.username };
  } catch {
    return { valid: false, error: 'Invalid token', status: 401 };
  }
}