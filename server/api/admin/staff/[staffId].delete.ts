import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const staffId = getRouterParam(event, 'staffId')
  if (!staffId) {
    throw createError({ statusCode: 400, statusMessage: 'Staff ID is required' })
  }

  const user = await db.user.delete({ where: { id: staffId } })
  return ok(user)
})
