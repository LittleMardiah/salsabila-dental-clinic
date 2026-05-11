'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';

interface AdminLoginModalProps {
  open: boolean;
  onClose: () => void;
}

export function AdminLoginModal({ open, onClose }: AdminLoginModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<'code' | 'credentials'>('code');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset state saat modal ditutup
  const handleClose = () => {
    setStep('code');
    setCode('');
    setUsername('');
    setPassword('');
    setError('');
    onClose();
  };

  // Step 1: Verifikasi kode 8 digit
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/admin/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kode salah');
      // Kode benar, lanjut ke step credentials
      setStep('credentials');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Login dengan username + password
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login gagal');
      // Sukses, redirect ke dashboard
      router.push('/admin/dashboard');
      handleClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'code' ? 'Akses Admin - Lapis 1' : 'Akses Admin - Lapis 2'}
          </DialogTitle>
        </DialogHeader>

        {step === 'code' ? (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <Label htmlFor="code">Kode Akses 8 Digit</Label>
              <Input
                id="code"
                type="text"
                placeholder="Masukkan kode 8 digit"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={8}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Memverifikasi...' : 'Verifikasi'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Username admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Login...' : 'Login'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}