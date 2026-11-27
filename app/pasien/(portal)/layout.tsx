import { redirect } from 'next/navigation'
import PatientShell from '@/components/patient/PatientShell'
import { getVerifiedPatientSessionFromCookies } from '@/lib/portal-auth'

export const dynamic = 'force-dynamic'

export default async function PatientPortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getVerifiedPatientSessionFromCookies()
  if (!session) redirect('/pasien/masuk')

  return <PatientShell>{children}</PatientShell>
}
