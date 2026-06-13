export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/middleware/auth';

export async function POST(request: Request) {
  const auth = await verifyAdminToken(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  try {
    await prisma.adminPreference.update({
      where: { adminId: auth.username! },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
      },
    });
    return NextResponse.json({ success: true, message: 'Google Drive connection revoked.' });
  } catch (error) {
    console.error('[Disconnect] Error:', error);
    return NextResponse.json({ error: 'Failed to revoke connection.' }, { status: 500 });
  }
}