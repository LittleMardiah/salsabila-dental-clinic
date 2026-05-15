import { NextResponse } from 'next/server'

export async function GET() {
  const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/backup/google-callback`
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=https://www.googleapis.com/auth/drive.file&access_type=offline&prompt=consent`
  return NextResponse.redirect(authUrl)
}