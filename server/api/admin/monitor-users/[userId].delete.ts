import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const userId = getRouterParam(event, 'userId')
  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User ID is required'
    })
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true }
  })

  if (!user || user.role !== 'monitor') {
    throw createError({
      statusCode: 404,
      statusMessage: 'Monitor user not found'
    })
  }

  await db.user.delete({ where: { id: userId } })

  return ok({ id: userId })
})
