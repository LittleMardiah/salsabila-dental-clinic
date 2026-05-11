import { NextResponse } from 'next/server'

export async function POST() {
  // Buat response sukses
  const response = NextResponse.json({
    success: true,
    message: 'Logout berhasil',
  })

  // Hapus cookie token dengan cara meng-set maxAge = -1 (expire langsung)
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: -1,  // -1 artinya hapus cookie
    path: '/',
  })

  // Opsional: hapus juga cookie lain jika ada (misal admin_code_verified, tapi biasanya sudah dihapus di login)
  response.cookies.delete('admin_code_verified')

  return response
}