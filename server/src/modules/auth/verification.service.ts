import { createHash } from 'node:crypto'
import type { User, VerificationChannel } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { env } from '../../config/env.js'
import { sendEmail } from '../../lib/mailer.js'
import { HttpError } from '../../utils/httpError.js'

const CODE_TTL_MS = 10 * 60 * 1000 // 10 minutes
const MAX_ATTEMPTS = 5

function generateCode(): string {
  // 6-digit numeric, zero-padded.
  return String(Math.floor(100000 + Math.random() * 900000))
}

// Codes are short-lived and rate-limited, so a fast keyed SHA-256 (peppered
// with the JWT secret) is sufficient and constant-cost to compare.
function hashCode(code: string): string {
  return createHash('sha256').update(`${code}:${env.jwtSecret}`).digest('hex')
}

/// Create a fresh code for a channel, invalidating any previous unused ones.
async function issueCode(userId: string, channel: VerificationChannel): Promise<string> {
  const code = generateCode()
  await prisma.verificationCode.deleteMany({ where: { userId, channel, consumedAt: null } })
  await prisma.verificationCode.create({
    data: {
      userId,
      channel,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  })
  return code
}

export async function sendEmailCode(user: User): Promise<void> {
  const code = await issueCode(user.id, 'EMAIL')
  await sendEmail({
    to: user.email,
    subject: `${brand()} email confirmation code`,
    text: `Your ${brand()} email confirmation code is ${code}. It expires in 10 minutes.`,
  })
}

function brand(): string {
  return 'Chaya Bari'
}

/// Validate a submitted code for a channel. On success marks it consumed and
/// returns true; on a wrong/expired code it throws a 400 (counting attempts).
export async function consumeCode(userId: string, channel: VerificationChannel, code: string): Promise<void> {
  const record = await prisma.verificationCode.findFirst({
    where: { userId, channel, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  })
  if (!record) throw HttpError.badRequest('No pending code. Please request a new one.')
  if (record.expiresAt.getTime() < Date.now()) {
    throw HttpError.badRequest('Code expired. Please request a new one.')
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    throw HttpError.badRequest('Too many attempts. Please request a new code.')
  }
  if (record.codeHash !== hashCode(code)) {
    await prisma.verificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    })
    throw HttpError.badRequest('Incorrect code.')
  }
  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  })
}
