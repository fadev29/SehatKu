import { createError } from 'h3'
import { hashPassword } from 'better-auth/crypto'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'
import { adminPatientSchema } from '~~/shared/validators/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const data = adminPatientSchema.parse(body)

  if (data.email) {
    const existingUser = await db.user.findUnique({
      where: { email: data.email },
      select: { id: true }
    })

    if (existingUser) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Email pasien sudah terdaftar'
      })
    }
  }

  const user = await db.user.create({
    data: {
      name: data.fullName,
      email: data.email ?? `${crypto.randomUUID()}@patient.local`,
      role: 'patient',
      emailVerified: Boolean(data.email)
    }
  })

  if (data.password && data.email) {
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

  const patient = await db.patient.create({
    data: {
      userId: user.id,
      fullName: data.fullName,
      phone: data.phone
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          emailVerified: true
        }
      }
    }
  })

  return ok(patient)
})
