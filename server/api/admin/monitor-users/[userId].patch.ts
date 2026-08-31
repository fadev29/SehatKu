import { createError } from 'h3'
import { hashPassword } from 'better-auth/crypto'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'
import { adminMonitorUserSchema } from '~~/shared/validators/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const userId = getRouterParam(event, 'userId')
  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User ID is required'
    })
  }

  const body = await readBody(event)
  const data = adminMonitorUserSchema.partial().parse(body)

  const existingUser = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true }
  })

  if (!existingUser || existingUser.role !== 'monitor') {
    throw createError({
      statusCode: 404,
      statusMessage: 'Monitor user not found'
    })
  }

  const user = await db.user.update({
    where: { id: userId },
    data: {
      ...(data.email ? { email: data.email } : {}),
      ...(data.name ? { name: data.name } : {}),
      ...(data.clinicId ? { monitorClinicId: data.clinicId } : {})
    },
    include: {
      monitorClinic: true
    }
  })

  if (data.password) {
    const passwordHash = await hashPassword(data.password)

    await db.account.upsert({
      where: {
        issuer_accountId: {
          issuer: 'local:credential',
          accountId: user.id
        }
      },
      update: {
        password: passwordHash,
        providerId: 'credential'
      },
      create: {
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
