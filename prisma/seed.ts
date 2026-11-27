/**
 * Opt-in demo seed for the patient PWA.
 * Run with `npm run db:seed` against a development database.
 * It is idempotent: existing demo patients/visits are left untouched.
 */
import { prisma } from '../lib/prisma'
import { DEMO_ACCOUNTS, DEMO_PASSWORD, ensureDemoAccount } from '../lib/portal-demo'

async function main() {
  for (const account of DEMO_ACCOUNTS) {
    await ensureDemoAccount(account.persona)
    console.log(`[seed] ${account.name} <${account.email}> siap — sandi: ${DEMO_PASSWORD}`)
  }
}

main()
  .catch((error) => {
    console.error('[seed] gagal menyiapkan akun demo:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
