import { createError } from 'h3'
import { hashPassword } from 'better-auth/crypto'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'
import { adminStaffSchema } from '~~/shared/validators/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const data = adminStaffSchema.parse(body)

  const existingUser = await db.user.findUnique({
    where: { email: data.email },
    select: { id: true }
  })

  if (existingUser) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Email staff sudah terdaftar'
    })
  }

  const user = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: 'staff',
      emailVerified: true
    }
  })

  if (data.password) {
    const passwordHash = await hashPassword(data.password)

    await db.account.create({
      data: {
        userId: user.id,
        issuer: 'local:credential',
        accountId: user.id,
        providerId: 'credential',
        password: passwordHash
      }
    })
  }

  return ok(user)
})
