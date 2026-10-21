import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

// Sign-in is Google only (vault D-AUTH-004). This only fills the legacy
// User.passwordHash column with a hash of random bytes, which nobody can use.
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS)
}
