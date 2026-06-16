'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button'; 
import { toast } from 'sonner'; 

export function BackupButton() {
  const [loading, setLoading] = useState(false);

  const handleBackup = async () => {
    setLoading(true);
    try {
      // Ambil token dari environment variable (bisa disimpan di .env.local)
      const backupToken = process.env.NEXT_PUBLIC_BACKUP_TOKEN || '';

      const res = await fetch('/api/backup/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-backup-token': backupToken,
        },
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Backup dimulai! Cek email untuk notifikasi.');
      } else {
        toast.error(data.error || 'Gagal memulai backup.');
      }
    } catch (error) {
      console.error('Backup trigger error:', error);
      toast.error('Terjadi kesalahan jaringan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleBackup}
      disabled={loading}
      className="w-full md:w-auto"
    >
      {loading ? 'Memproses...' : '☁️ Backup Cloud Sekarang'}
    </Button>
  );
}