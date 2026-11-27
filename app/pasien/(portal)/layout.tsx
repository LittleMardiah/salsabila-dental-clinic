import { redirect } from 'next/navigation'
import PatientShell from '@/components/patient/PatientShell'
import { getPatientSessionFromCookies } from '@/lib/portal-auth'

export const dynamic = 'force-dynamic'

export default function PatientPortalLayout({ children }: { children: React.ReactNode }) {
  const session = getPatientSessionFromCookies()
  if (!session) redirect('/pasien/masuk')

  return <PatientShell>{children}</PatientShell>
}
