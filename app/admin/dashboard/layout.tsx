import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isAdminTokenPayload } from '@/lib/admin-auth'
import { verifyJWT } from '@/lib/ServerAuth'

export const dynamic = 'force-dynamic'

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get('token')?.value
  let hasFullAdminSession = false

  if (token) {
    try {
      hasFullAdminSession = isAdminTokenPayload(verifyJWT(token))
    } catch {
      hasFullAdminSession = false
    }
  }

  if (!hasFullAdminSession) {
    redirect('/admin/login')
  }

  return <>{children}</>
}
