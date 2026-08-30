import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireStaff } from '~~/server/utils/require-staff'
import { getTodayRange } from '~~/server/utils/today-range'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const { start, end } = getTodayRange()

  const bookings = await db.booking.findMany({
    where: {
      scheduleDate: {
        gte: start,
        lte: end,
      },
      status: {
        in: ['booked', 'checked_in'],
      },
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
          queue: true,
        },
      },
    },
    orderBy: [
      { status: 'asc' },
      { scheduleTime: 'asc' },
      { createdAt: 'asc' },
    ],
  })

  return ok(bookings)
})
