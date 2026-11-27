import { jwtVerify } from 'jose';
import { isAdminTokenPayload } from '@/lib/admin-auth';

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
    if (!isAdminTokenPayload(payload)) return null;
    return { username: payload.username, role: 'admin' };
  } catch (error) {
    console.error(
      'Token verification failed (Edge):',
      error instanceof Error ? error.message : 'unknown error'
    );
    return null;
  }
}