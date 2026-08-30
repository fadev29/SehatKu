import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireStaff } from '~~/server/utils/require-staff'
import { getTodayRange } from '~~/server/utils/today-range'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const { start, end } = getTodayRange()

  const queues = await db.queue.findMany({
    where: {
      createdAt: {
        gte: start,
        lte: end
      }
    },
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
    },
    orderBy: [
      { status: 'asc' },
      { createdAt: 'asc' }
    ]
  })

  return ok(queues)
})
