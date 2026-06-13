import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/ServerAuth';

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });
  const data = await response.json();
  return data.access_token || null;
}

export async function GET(request: Request) {
  // FIX: Sesuaikan pemanggilan verifyAdminToken karena sekarang menggunakan ServerAuth
  const auth = await verifyAdminToken(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const pref = await prisma.adminPreference.findUnique({
    where: { adminId: auth.username! },
  });

  if (!pref?.googleAccessToken) {
    return NextResponse.json({ error: 'Google Drive not connected' }, { status: 400 });
  }

  let accessToken = pref.googleAccessToken;
  if (pref.googleTokenExpiry && new Date() > pref.googleTokenExpiry) {
    if (!pref.googleRefreshToken) {
      return NextResponse.json({ error: 'Refresh token missing' }, { status: 401 });
    }
    const newToken = await refreshAccessToken(pref.googleRefreshToken);
    if (!newToken) {
      return NextResponse.json({ error: 'Failed to refresh token' }, { status: 401 });
    }
    accessToken = newToken;
    await prisma.adminPreference.update({
      where: { adminId: auth.username! },
      data: {
        googleAccessToken: newToken,
        googleTokenExpiry: new Date(Date.now() + 3600 * 1000),
      },
    });
  }

  try {
    const driveResponse = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!driveResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch from Google Drive API' }, { status: driveResponse.status });
    }
    const driveData = await driveResponse.json();
    const quota = driveData.storageQuota;
    return NextResponse.json({
      used: parseInt(quota.usage, 10),
      limit: parseInt(quota.limit, 10),
    });
  } catch (error) {
    console.error('[Drive Storage] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}