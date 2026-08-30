import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { buildQueueEvent } from '~~/server/utils/realtime-events'
import { requireDoctor } from '~~/server/utils/require-doctor'
import { getTodayRange } from '~~/server/utils/today-range'

export async function handleDoctorQueueAction(
  event: Parameters<typeof requireDoctor>[0],
  status: 'called' | 'skipped' | 'completed'
) {
  const session = await requireDoctor(event)
  const { start, end } = getTodayRange()

  const queueId = getRouterParam(event, 'queueId')
  if (!queueId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Queue ID is required'
    })
  }

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

  if (queue.doctor.userId !== session.user.id && session.user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Anda tidak boleh mengubah antrean dokter lain'
    })
  }

  if (status === 'called' && queue.status !== 'waiting') {
    throw createError({
      statusCode: 409,
      statusMessage: queue.status === 'called'
        ? `Antrean ${queue.queueNumber} sudah sedang dipanggil`
        : `Antrean ${queue.queueNumber} tidak bisa dipanggil dari status ${queue.status}`
    })
  }

  if (status === 'skipped' && queue.status !== 'called') {
    throw createError({
      statusCode: 409,
      statusMessage: `Antrean ${queue.queueNumber} hanya bisa di-skip saat sedang dipanggil`
    })
  }

  if (status === 'completed' && queue.status !== 'called') {
    throw createError({
      statusCode: 409,
      statusMessage: `Antrean ${queue.queueNumber} hanya bisa diselesaikan saat sedang dipanggil`
    })
  }

  if (status === 'called') {
    const existingCalledQueue = await db.queue.findFirst({
      where: {
        doctorId: queue.doctorId,
        status: 'called',
        id: { not: queueId },
        createdAt: {
          gte: start,
          lte: end
        }
      },
      select: {
        id: true,
        queueNumber: true
      }
    })

    if (existingCalledQueue) {
      throw createError({
        statusCode: 409,
        statusMessage: `Antrean ${existingCalledQueue.queueNumber} masih aktif. Selesaikan atau skip dulu.`
      })
    }
  }

  const updateData: Record<string, unknown> = {
    status
  }

  if (status === 'called') updateData.calledAt = new Date()
  if (status === 'skipped') updateData.skippedAt = new Date()
  if (status === 'completed') updateData.completedAt = new Date()

  const updatedQueue = await db.queue.update({
    where: { id: queueId },
    data: updateData,
    include: {
      doctor: true
    }
  })

  const realtimeEventName = status === 'called'
    ? 'queue.called'
    : status === 'completed'
      ? 'queue.completed'
      : 'queue.updated'

  return ok({
    queue: updatedQueue,
    realtime: buildQueueEvent(realtimeEventName, updatedQueue, updatedQueue.doctor.fullName)
  })
}
