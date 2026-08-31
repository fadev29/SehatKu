import { createError, getQuery } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { buildMonitorActiveEvent, buildMonitorIdleEvent } from '~~/server/utils/realtime-events'
import { requireMonitor } from '~~/server/utils/require-monitor'
import { getTodayRange } from '~~/server/utils/today-range'

export default defineEventHandler(async (event) => {
  const session = await requireMonitor(event)
  const { start, end } = getTodayRange()
  const query = getQuery(event)
  const requestedClinicId = typeof query.clinicId === 'string' && query.clinicId.trim().length > 0
    ? query.clinicId.trim()
    : undefined

  const clinicId = session.user.role === 'monitor'
    ? session.user.monitorClinicId || undefined
    : requestedClinicId

  if (session.user.role === 'monitor' && !clinicId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Akun monitor belum terhubung ke klinik'
    })
  }

  if (session.user.role === 'monitor' && requestedClinicId && requestedClinicId !== clinicId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Akun monitor hanya boleh melihat cabang klinik sendiri'
    })
  }

  if (clinicId) {
    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true }
    })

    if (!clinic) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Klinik tidak ditemukan'
      })
    }
  }

  const queueWhere = {
    createdAt: {
      gte: start,
      lte: end
    },
    ...(clinicId
      ? {
          doctor: {
            clinicId
          }
        }
      : {})
  }

  const [currentQueue, nextQueues, videos] = await Promise.all([
    db.queue.findFirst({
      where: {
        ...queueWhere,
        status: 'called'
      },
      include: {
        doctor: {
          include: {
            clinic: true,
            service: true
          }
        },
        checkIn: {
          include: {
            booking: {
              include: {
                patient: true
              }
            }
          }
        }
      },
      orderBy: { calledAt: 'desc' }
    }),
    db.queue.findMany({
      where: {
        ...queueWhere,
        status: 'waiting'
      },
      include: {
        doctor: {
          include: {
            clinic: true,
            service: true
          }
        },
        checkIn: {
          include: {
            booking: {
              include: {
                patient: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 5
    }),
    db.monitorAd.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        youtubeUrl: true
      },
      orderBy: { createdAt: 'desc' }
    })
  ])

  const realtime = currentQueue
    ? buildMonitorActiveEvent(currentQueue, currentQueue.doctor)
    : buildMonitorIdleEvent(videos)

  return ok({
    currentQueue,
    nextQueue: nextQueues[0] ?? null,
    waitingQueues: nextQueues,
    selectedClinicId: clinicId ?? null,
    lastUpdatedAt: new Date().toISOString(),
    realtime
  })
})
