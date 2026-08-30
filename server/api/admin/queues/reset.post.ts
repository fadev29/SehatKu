import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'
import { getTodayRange } from '~~/server/utils/today-range'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const doctorId = typeof body?.doctorId === 'string' ? body.doctorId : undefined
  const force = body?.force === true
  const { start, end } = getTodayRange()

  const activeQueues = await db.queue.findMany({
    where: {
      doctorId,
      createdAt: {
        gte: start,
        lte: end
      },
      status: {
        in: ['waiting', 'called']
      }
    },
    select: {
      id: true,
      queueNumber: true,
      status: true
    }
  })

  if (activeQueues.length > 0 && !force) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Masih ada antrean aktif hari ini. Kirim `force: true` untuk reset paksa.'
    })
  }

  return ok({
    reset: false,
    mode: 'manual',
    doctorId: doctorId ?? null,
    affectedQueues: activeQueues.length,
    queues: activeQueues,
    ponytail: 'Scaffold only. Saat ini route hanya preview validasi reset. Upgrade: tambah arsip harian atau counter harian per dokter.'
  })
})
