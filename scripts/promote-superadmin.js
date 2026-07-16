// Bootstrap the first SUPER_ADMIN (create the account if it doesn't exist yet).
//
// Run AFTER the new code (with SUPER_ADMIN support) is deployed, otherwise the
// old build's `role === 'ADMIN'` checks would lock this account out of the dashboard.
// The staff migration (20260716000000) must be applied first: `npx prisma migrate deploy`.
//
// Usage:
//   node --env-file=.env scripts/promote-superadmin.js <phone>
//   node --env-file=.env scripts/promote-superadmin.js <phone> --reset-password '<pwd>'
//   node --env-file=.env scripts/promote-superadmin.js <phone> --reset-password '<pwd>' \
//     --username '<name>'            # required data when the account doesn't exist yet
//   ... --deactivate <otherPhone>    # also disable a legacy/seeded admin account
//
// The password is passed as an argument (never stored in code); it is bcrypt-hashed
// before it touches the database.

const { PrismaClient } = require('@prisma/client')
const { hash } = require('bcryptjs')

const prisma = new PrismaClient()

function argValue(flag) {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 ? process.argv[idx + 1] : null
}

async function main() {
  const phone = process.argv[2]
  if (!phone || phone.startsWith('--')) {
    console.error(
      'Usage: node --env-file=.env scripts/promote-superadmin.js <phone> [--reset-password <pwd>] [--username <name>] [--deactivate <otherPhone>]'
    )
    process.exit(1)
  }

  const newPassword = argValue('--reset-password')
  const username = argValue('--username')
  const deactivatePhone = argValue('--deactivate')

  if (newPassword && newPassword.length < 8) {
    console.error('Password must be at least 8 characters')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({ where: { phone } })

  if (!user) {
    if (!newPassword) {
      console.error(`No user found with phone ${phone}. To create the account, pass --reset-password '<pwd>' (and optionally --username '<name>').`)
      process.exit(1)
    }
    const created = await prisma.user.create({
      data: {
        phone,
        passwordHash: await hash(newPassword, 12),
        username: username || 'مدير النظام',
        role: 'SUPER_ADMIN',
        permissions: [],
        isVerified: true,
        isActive: true,
      },
    })
    console.log(`✅ Created SUPER_ADMIN ${created.username} (${phone})`)
  } else {
    const data = { role: 'SUPER_ADMIN', permissions: [], isActive: true }
    if (newPassword) data.passwordHash = await hash(newPassword, 12)
    if (username) data.username = username
    await prisma.user.update({ where: { phone }, data })
    console.log(`✅ ${username || user.username} (${phone}) is now SUPER_ADMIN`)
    if (newPassword) console.log('✅ Password updated')
  }

  if (deactivatePhone) {
    const legacy = await prisma.user.findUnique({ where: { phone: deactivatePhone } })
    if (!legacy) {
      console.log(`ℹ️ No account with phone ${deactivatePhone} — nothing to deactivate`)
    } else if (legacy.phone === phone) {
      console.error('Refusing to deactivate the account being promoted')
    } else {
      await prisma.user.update({ where: { phone: deactivatePhone }, data: { isActive: false } })
      console.log(`✅ Deactivated ${legacy.username} (${deactivatePhone})`)
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
