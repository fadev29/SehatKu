import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireStaff } from '~~/server/utils/require-staff'
import { manualSearchSchema } from '~~/shared/validators/staff'
import { getTodayRange } from '~~/server/utils/today-range'

export default defineEventHandler(async (event) => {
  await requireStaff(event)

  const body = await readBody(event)
  const data = manualSearchSchema.parse(body)
  const { start, end } = getTodayRange()

  const bookings = await db.booking.findMany({
    where: {
      status: 'booked',
      scheduleDate: {
        gte: start,
        lte: end
      },
      OR: [
        {
          patient: {
            fullName: {
              contains: data.keyword,
              mode: 'insensitive'
            }
          }
        },
        {
          patient: {
            phone: {
              contains: data.keyword
            }
          }
        }
      ]
    },
    include: {
      patient: true,
      doctor: {
        include: {
          clinic: true,
          service: true,
        },
      },
      checkIn: {
        include: {
          queue: true
        }
      }
    },
    take: 10,
    orderBy: { createdAt: 'desc' }
  })

  return ok(bookings)
})
