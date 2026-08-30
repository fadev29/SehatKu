import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireStaff } from '~~/server/utils/require-staff'
import { getTodayRange } from '~~/server/utils/today-range'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const { start, end } = getTodayRange()

  const checkIns = await db.checkIn.findMany({
    where: {
      checkedInAt: {
        gte: start,
        lte: end
      }
    },
    include: {
      booking: {
        include: {
          patient: true,
          doctor: true
        }
      },
      queue: true
    },
    orderBy: { checkedInAt: 'desc' }
  })

  return ok(checkIns)
})
