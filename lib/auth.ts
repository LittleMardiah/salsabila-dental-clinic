import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

/**
 * Hash password menggunakan bcrypt
 * @param password - plain text password
 * @returns hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verifikasi password dengan hash
 * @param password - plain text password
 * @param hash - hashed password dari database atau env
 * @returns boolean true jika cocok
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 * @param payload - data yang akan disimpan di token (misal { username, role })
 * @param expiresIn - waktu kadaluarsa (contoh: '24h', '7d')
 * @returns JWT token string
 */
export function generateJWT(payload: object, expiresIn: string = '24h'): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined in environment variables');
  return jwt.sign(payload, secret, { expiresIn } as any);
}

/**
 * Verifikasi JWT token
 * @param token - JWT token string
 * @returns decoded payload atau throw error jika invalid
 */
export function verifyJWT(token: string): any {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined in environment variables');
  return jwt.verify(token, secret);
}