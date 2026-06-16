import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminToken } from '@/lib/ServerAuth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const BUCKET_NAME = 'emr-photos';

export async function GET(req: Request) {
  const auth = await verifyAdminToken(req);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Ambil daftar file dari bucket (tanpa download konten)
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { limit: 1000 });

    if (error) throw error;

    // Hitung total ukuran
    const totalSize = data.reduce((acc, file) => acc + (file.metadata?.size || 0), 0);
    const totalSizeMB = totalSize / (1024 * 1024);

    return NextResponse.json({ sizeMB: totalSizeMB, fileCount: data.length });
  } catch (error: any) {
    console.error('[Storage Size] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}