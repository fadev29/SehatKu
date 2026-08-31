import { createError } from 'h3'
import { hashPassword } from 'better-auth/crypto'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'
import { adminMonitorUserSchema } from '~~/shared/validators/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const data = adminMonitorUserSchema.parse(body)

  const existingUser = await db.user.findUnique({
    where: { email: data.email },
    select: { id: true }
  })

  if (existingUser) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Email monitor sudah terdaftar'
    })
  }

  const passwordHash = await hashPassword(data.password || 'password123')

  const user = await db.user.create({
    data: {
      email: data.email,
      name: data.name,
      role: 'monitor',
      emailVerified: true,
      monitorClinicId: data.clinicId
    },
    include: {
      monitorClinic: true
    }
  })

  await db.account.create({
    data: {
      userId: user.id,
      issuer: 'local:credential',
      accountId: user.id,
      providerId: 'credential',
      password: passwordHash
    }
  })

  return ok(user)
})
