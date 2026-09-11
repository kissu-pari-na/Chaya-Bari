import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Seed the initial Admin (business owner) and Kitchen accounts. Passwords come
// from env so real secrets are never committed; the printed defaults are for
// local development only.
async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@chayabari.local'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin12345'
  const kitchenEmail = process.env.SEED_KITCHEN_EMAIL ?? 'kitchen@chayabari.local'
  const kitchenPassword = process.env.SEED_KITCHEN_PASSWORD ?? 'kitchen12345'

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Md. Mozahidul Islam Bhuiyan',
      email: adminEmail,
      phone: null,
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(adminPassword, 10),
    },
  })

  await prisma.user.upsert({
    where: { email: kitchenEmail },
    update: {},
    create: {
      name: 'Kitchen',
      email: kitchenEmail,
      phone: null,
      role: 'KITCHEN',
      passwordHash: await bcrypt.hash(kitchenPassword, 10),
    },
  })

  console.log('Seeded accounts:')
  console.log(`  ADMIN   -> ${adminEmail} / ${adminPassword}`)
  console.log(`  KITCHEN -> ${kitchenEmail} / ${kitchenPassword}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
