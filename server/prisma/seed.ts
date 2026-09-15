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
      phoneVerifiedAt: new Date(),
      emailVerifiedAt: new Date(),
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
      phoneVerifiedAt: new Date(),
      emailVerifiedAt: new Date(),
    },
  })

  console.log('Seeded accounts:')
  console.log(`  ADMIN   -> ${adminEmail} / ${adminPassword}`)
  console.log(`  KITCHEN -> ${kitchenEmail} / ${kitchenPassword}`)

  await seedCatalog()
  await seedExpenseCategories()
  await seedReviews()
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

  const products: { name: string; nameEnglish?: string; price: number; category: string; description?: string; imageUrl?: string }[] = [
    { name: 'বিরিয়ানি', nameEnglish: 'Biryani', price: 220, category: 'ভাত ও বিরিয়ানি', description: 'ঘরে তৈরি কাচ্চি স্টাইল বিরিয়ানি' },
    { name: 'গরুর কালা ভুনা', nameEnglish: 'Beef Kala Bhuna', price: 260, category: 'ভাত ও বিরিয়ানি' },
    { name: 'পায়েস', nameEnglish: 'Payesh', price: 70, category: 'মিষ্টান্ন', description: 'দুধ, গুড় ও বাদাম দিয়ে তৈরি' },
    { name: 'কলিজা সিঙ্গারা', nameEnglish: 'Liver Singara', price: 20, category: 'স্ন্যাকস' },
    { name: 'স্টাফড বান', nameEnglish: 'Stuffed Bun', price: 50, category: 'স্ন্যাকস' },
    { name: 'প্লেইন কেক', nameEnglish: 'Plain Cake', price: 350, category: 'কেক ও পুডিং' },
    { name: 'ডাব পুডিং', nameEnglish: 'Coconut Pudding', price: 120, category: 'কেক ও পুডিং', imageUrl: '/products/daab-pudding.png' },
  ]

  let created = 0
  for (const p of products) {
    const exists = await prisma.product.findFirst({ where: { name: p.name } })
    if (exists) {
      // Keep an already-seeded product's image + English name in sync.
      const patch: { imageUrl?: string; nameEnglish?: string } = {}
      if (p.imageUrl && exists.imageUrl !== p.imageUrl) patch.imageUrl = p.imageUrl
      if (p.nameEnglish && !exists.nameEnglish) patch.nameEnglish = p.nameEnglish
      if (Object.keys(patch).length > 0) {
        await prisma.product.update({ where: { id: exists.id }, data: patch })
      }
      continue
    }
    await prisma.product.create({
      data: {
        name: p.name,
        nameEnglish: p.nameEnglish ?? null,
        description: p.description ?? null,
        imageUrl: p.imageUrl ?? null,
        price: p.price,
        categoryId: categoryByName.get(p.category) ?? null,
        priceHistory: { create: { price: p.price } },
      },
    })
    created += 1
  }
  console.log(`Seeded catalog: ${categories.length} categories, ${created} new products.`)
}

// Sample delivered orders + order-based reviews so the home page shows real
// testimonials and product ratings on a fresh install. Reviews are always tied
// to a delivered order (the only place a review can be created in the app).
async function seedReviews() {
  const demoCustomers: { name: string; email: string; comment: string; rating: number; product: string }[] = [
    { name: 'সাদিয়া রহমান', email: 'sadia.demo@chayabari.local', rating: 5, product: 'বিরিয়ানি', comment: 'একদম ঘরের মতো স্বাদ! বিরিয়ানি অসাধারণ ছিল, সময়মতো পৌঁছেছে।' },
    { name: 'তানভীর হাসান', email: 'tanvir.demo@chayabari.local', rating: 5, product: 'ডাব পুডিং', comment: 'তাজা, ঠান্ডা আর পরিমাণে ভালো। পরিবারের সবাই পছন্দ করেছে। আবার অর্ডার করব।' },
    { name: 'নুসরাত জাহান', email: 'nusrat.demo@chayabari.local', rating: 4, product: 'পায়েস', comment: 'পায়েসটা দারুণ ছিল, খুব বেশি মিষ্টি নয়। মান নিয়ে কোনো অভিযোগ নেই।' },
    { name: 'ইমরান কবির', email: 'imran.demo@chayabari.local', rating: 5, product: 'বিরিয়ানি', comment: 'মাংস একদম নরম, মশলা পারফেক্ট। ঢাকায় এত ভালো ঘরোয়া বিরিয়ানি কমই পাওয়া যায়।' },
    { name: 'ফারিয়া আক্তার', email: 'faria.demo@chayabari.local', rating: 4, product: 'প্লেইন কেক', comment: 'কেকটা নরম আর তাজা ছিল। জন্মদিনের জন্য নিয়েছিলাম, সবাই প্রশংসা করেছে।' },
  ]

  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  let count = 0
  for (let i = 0; i < demoCustomers.length; i++) {
    const d = demoCustomers[i]
    const user = await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: {
        name: d.name,
        email: d.email,
        role: 'CUSTOMER',
        passwordHash: await bcrypt.hash('demo12345', 10),
        phoneVerifiedAt: new Date(),
        emailVerifiedAt: new Date(),
        customer: { create: {} },
      },
      include: { customer: true },
    })
    const customer = user.customer ?? (await prisma.customer.create({ data: { userId: user.id } }))

    const product = await prisma.product.findFirst({ where: { name: d.product } })
    if (!product) continue

    const orderNumber = `CB-SEED-${String(i + 1).padStart(3, '0')}`
    const price = Number(product.price)
    // Idempotent: recreate the demo order fresh each seed run.
    await prisma.order.deleteMany({ where: { orderNumber } })
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        recipientName: d.name,
        recipientPhone: '01700000000',
        addressLine: 'ঢাকা',
        city: 'Dhaka',
        fulfillmentDate: twoDaysAgo,
        subtotal: price,
        customerDeliveryCost: 60,
        total: price + 60,
        status: 'DELIVERED',
        deliveredAt: twoDaysAgo,
        // Already invited so the boot dispatcher does not re-notify demo users.
        reviewInviteSentAt: twoDaysAgo,
        items: {
          create: {
            productId: product.id,
            productName: product.name,
            listUnitPrice: price,
            unitPrice: price,
            quantity: 1,
            lineTotal: price,
            kitchenStage: 'READY',
          },
        },
      },
    })

    await prisma.review.create({
      data: { orderId: order.id, productId: product.id, customerId: customer.id, rating: d.rating, comment: d.comment },
    })
    count += 1
  }
  console.log(`Seeded ${count} delivered demo orders with reviews.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
