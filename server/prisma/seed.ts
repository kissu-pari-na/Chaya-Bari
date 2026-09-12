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

  await seedCatalog()
  await seedExpenseCategories()
}

// Default general-expense categories.
async function seedExpenseCategories() {
  const names = ['গ্যাস', 'বিদ্যুৎ', 'মার্কেটিং', 'যন্ত্রপাতি', 'বিবিধ', 'অন্যান্য']
  for (const name of names) {
    await prisma.expenseCategory.upsert({ where: { name }, update: {}, create: { name } })
  }
  console.log(`Seeded ${names.length} expense categories.`)
}

// Sample categories + products so the catalog isn't empty in a fresh install.
async function seedCatalog() {
  const categories: { name: string; sortOrder: number }[] = [
    { name: 'ভাত ও বিরিয়ানি', sortOrder: 1 },
    { name: 'মিষ্টান্ন', sortOrder: 2 },
    { name: 'স্ন্যাকস', sortOrder: 3 },
    { name: 'কেক ও পুডিং', sortOrder: 4 },
  ]
  const categoryByName = new Map<string, string>()
  for (const c of categories) {
    const category = await prisma.productCategory.upsert({
      where: { name: c.name },
      update: { sortOrder: c.sortOrder },
      create: c,
    })
    categoryByName.set(c.name, category.id)
  }

  const products: { name: string; price: number; category: string; description?: string }[] = [
    { name: 'বিরিয়ানি', price: 220, category: 'ভাত ও বিরিয়ানি', description: 'ঘরে তৈরি কাচ্চি স্টাইল বিরিয়ানি' },
    { name: 'গরুর কালা ভুনা', price: 260, category: 'ভাত ও বিরিয়ানি' },
    { name: 'পায়েস', price: 70, category: 'মিষ্টান্ন', description: 'দুধ, গুড় ও বাদাম দিয়ে তৈরি' },
    { name: 'কলিজা সিঙ্গারা', price: 20, category: 'স্ন্যাকস' },
    { name: 'স্টাফড বান', price: 50, category: 'স্ন্যাকস' },
    { name: 'প্লেইন কেক', price: 350, category: 'কেক ও পুডিং' },
    { name: 'ডাব পুডিং', price: 120, category: 'কেক ও পুডিং' },
  ]

  let created = 0
  for (const p of products) {
    const exists = await prisma.product.findFirst({ where: { name: p.name } })
    if (exists) continue
    await prisma.product.create({
      data: {
        name: p.name,
        description: p.description ?? null,
        price: p.price,
        categoryId: categoryByName.get(p.category) ?? null,
        priceHistory: { create: { price: p.price } },
      },
    })
    created += 1
  }
  console.log(`Seeded catalog: ${categories.length} categories, ${created} new products.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
