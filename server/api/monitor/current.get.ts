import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { buildMonitorActiveEvent, buildMonitorIdleEvent } from '~~/server/utils/realtime-events'
import { getTodayRange } from '~~/server/utils/today-range'

export default defineEventHandler(async () => {
  const { start, end } = getTodayRange()

  const [currentQueue, nextQueues, videos] = await Promise.all([
    db.queue.findFirst({
      where: {
        status: 'called',
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        doctor: {
          include: {
            clinic: true,
            service: true,
          },
        },
        checkIn: {
          include: {
            booking: {
              include: {
                patient: true,
              },
            },
          },
        },
      },
      orderBy: { calledAt: 'desc' },
    }),
    db.queue.findMany({
      where: {
        status: 'waiting',
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        doctor: {
          include: {
            clinic: true,
            service: true,
          },
        },
        checkIn: {
          include: {
            booking: {
              include: {
                patient: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 5,
    }),
    db.monitorAd.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        youtubeUrl: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const realtime = currentQueue
    ? buildMonitorActiveEvent(currentQueue, currentQueue.doctor)
    : buildMonitorIdleEvent(videos)

  return ok({
    currentQueue,
    nextQueue: nextQueues[0] ?? null,
    waitingQueues: nextQueues,
    lastUpdatedAt: new Date().toISOString(),
    realtime,
  })
})
