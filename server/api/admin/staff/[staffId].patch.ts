import { createError } from 'h3'
import { hashPassword } from 'better-auth/crypto'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'
import { adminStaffSchema } from '~~/shared/validators/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const staffId = getRouterParam(event, 'staffId')
  if (!staffId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Staff ID is required'
    })
  }

  const body = await readBody(event)
  const data = adminStaffSchema.partial().parse(body)

  const user = await db.user.update({
    where: { id: staffId },
    data: {
      name: data.name,
      email: data.email,
      role: data.role
    }
  })

  if (data.password) {
    const passwordHash = await hashPassword(data.password)

    await db.account.upsert({
      where: {
        issuer_accountId: {
          issuer: 'local:credential',
          accountId: staffId
        }
      },
      update: {
        password: passwordHash,
        providerId: 'credential'
      },
      create: {
        userId: staffId,
        issuer: 'local:credential',
        accountId: staffId,
        providerId: 'credential',
        password: passwordHash
      }
    })
  }

  return ok(user)
})
