import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/ServerAuth';

export async function POST(req: NextRequest) {
  // Verifikasi admin menggunakan sistem auth yang sudah ada
  const auth = await verifyAdminToken(req);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verifikasi token backup (header opsional, untuk keamanan tambahan)
  //    Ini mencegah orang yang memiliki token admin tapi bukan admin asli (misal dari session)
  const backupToken = req.headers.get('x-backup-token');
  if (backupToken !== process.env.BACKUP_TRIGGER_TOKEN) {
    return NextResponse.json({ error: 'Invalid backup token' }, { status: 403 });
  }

  // Siapkan konfigurasi GitHub dari environment variables
  const ghPat = process.env.GH_PAT;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!ghPat || !repo) {
    console.error('Missing GitHub configuration:', { ghPat: !!ghPat, repo: !!repo });
    return NextResponse.json({ error: 'Missing GitHub configuration' }, { status: 500 });
  }

  const [owner, repoName] = repo.split('/');
  const workflowId = 'backup-supabase.yml';

  // 4. Trigger workflow dispatch via GitHub API
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/${workflowId}/dispatches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ghPat}`,
        'Accept': 'application/vnd.github+json',
      },
      body: JSON.stringify({ ref: 'main' }), 
    }
  );

  // Tangani respon dari GitHub
  if (!response.ok) {
    const errorText = await response.text();
    console.error('GitHub API error:', response.status, errorText);
    return NextResponse.json(
      { error: `Failed to trigger workflow: ${response.status}` },
      { status: 500 }
    );
  }

  // Berhasil memicu workflow
  return NextResponse.json({
    success: true,
    message: 'Backup workflow triggered successfully',
  });
}