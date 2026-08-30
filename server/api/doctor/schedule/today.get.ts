import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireDoctor } from '~~/server/utils/require-doctor'
import { getTodayRange } from '~~/server/utils/today-range'

export default defineEventHandler(async (event) => {
  const session = await requireDoctor(event)
  const { start, end } = getTodayRange()

  const schedules = await db.schedule.findMany({
    where: {
      isActive: true,
      scheduleDate: {
        gte: start,
        lte: end
      },
      doctor: {
        userId: session.user.id,
        isActive: true
      }
    },
    include: {
      doctor: {
        include: {
          clinic: true,
          service: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      }
    },
    orderBy: { startTime: 'asc' }
  })

  return ok(schedules)
})
