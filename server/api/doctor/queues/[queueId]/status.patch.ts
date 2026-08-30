import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { buildQueueEvent } from '~~/server/utils/realtime-events'
import { requireDoctor } from '~~/server/utils/require-doctor'
import { updateQueueStatusSchema } from '~~/shared/validators/queue'

export default defineEventHandler(async (event) => {
  await requireDoctor(event)

  const queueId = getRouterParam(event, 'queueId')
  if (!queueId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Queue ID is required'
    })
  }

  const body = await readBody(event)
  const data = updateQueueStatusSchema.parse(body)

  const queue = await db.queue.findUnique({
    where: { id: queueId },
    include: {
      doctor: true
    }
  })

  if (!queue) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Queue not found'
    })
  }

  const updateData: Record<string, unknown> = {
    status: data.status
  }

  if (data.status === 'called') updateData.calledAt = new Date()
  if (data.status === 'skipped') updateData.skippedAt = new Date()
  if (data.status === 'completed') updateData.completedAt = new Date()

  const updatedQueue = await db.queue.update({
    where: { id: queueId },
    data: updateData,
    include: {
      doctor: true
    }
  })

  const realtimeEventName = data.status === 'called'
    ? 'queue.called'
    : data.status === 'completed'
      ? 'queue.completed'
      : 'queue.updated'

  return ok({
    queue: updatedQueue,
    realtime: buildQueueEvent(realtimeEventName, updatedQueue, updatedQueue.doctor.fullName)
  })
})
