import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'
import { adminQueueSchema } from '~~/shared/validators/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const queueId = getRouterParam(event, 'queueId')
  if (!queueId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Queue ID is required'
    })
  }

  const body = await readBody(event)
  const data = adminQueueSchema.parse(body)

  const updateData: Record<string, unknown> = {
    status: data.status,
    ...(data.queueNumber ? { queueNumber: data.queueNumber } : {})
  }

  if (data.status === 'called') updateData.calledAt = new Date()
  if (data.status === 'skipped') updateData.skippedAt = new Date()
  if (data.status === 'completed') updateData.completedAt = new Date()
  if (data.status === 'waiting') {
    updateData.calledAt = null
    updateData.skippedAt = null
    updateData.completedAt = null
  }

  const queue = await db.queue.update({
    where: { id: queueId },
    data: updateData,
    include: {
      doctor: true,
      checkIn: {
        include: {
          booking: {
            include: {
              patient: true
            }
          }
        }
      },
      printJobs: true
    }
  })

  return ok(queue)
})
