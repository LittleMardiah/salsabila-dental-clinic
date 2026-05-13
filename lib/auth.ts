import { jwtVerify } from 'jose';

/**
 * Verifikasi JWT token untuk Edge Runtime (middleware)
 */
export async function verifyTokenEdge(token: string): Promise<{ username: string; role: string } | null> {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET not defined');
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (payload.role !== 'admin') return null;
    return { username: payload.username as string, role: payload.role as string };
  } catch (error) {
    console.error('Token verification failed (Edge):', error);
    return null;
  }
}