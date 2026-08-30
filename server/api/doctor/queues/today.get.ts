import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireDoctor } from '~~/server/utils/require-doctor'
import { getTodayRange } from '~~/server/utils/today-range'

export default defineEventHandler(async (event) => {
  const session = await requireDoctor(event)
  const { start, end } = getTodayRange()

  const doctor = await db.doctor.findFirst({
    where: {
      userId: session.user.id,
      isActive: true
    },
    select: { id: true }
  })

  if (!doctor) {
    return ok([])
  }

  const queues = await db.queue.findMany({
    where: {
      doctorId: doctor.id,
      createdAt: {
        gte: start,
        lte: end
      }
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
    orderBy: { createdAt: 'asc' }
  })

  return ok(queues)
})
