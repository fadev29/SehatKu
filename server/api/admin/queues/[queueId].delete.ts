import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const queueId = getRouterParam(event, 'queueId')
  if (!queueId) {
    throw createError({ statusCode: 400, statusMessage: 'Queue ID is required' })
  }

  const queue = await db.queue.delete({ where: { id: queueId } })
  return ok(queue)
})
