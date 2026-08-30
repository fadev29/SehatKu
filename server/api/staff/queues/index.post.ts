import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { formatQueueNumber } from '~~/server/utils/queue-number'
import { requireStaff } from '~~/server/utils/require-staff'
import { getTodayRange } from '~~/server/utils/today-range'
import { createQueueSchema } from '~~/shared/validators/staff'

export default defineEventHandler(async (event) => {
  const session = await requireStaff(event)

  const body = await readBody(event)
  const data = createQueueSchema.parse(body)
  const { start, end } = getTodayRange()

  const booking = await db.booking.findFirst({
    where: {
      id: data.bookingId,
      status: 'booked',
      scheduleDate: {
        gte: start,
        lte: end
      }
    },
    include: {
      checkIn: {
        include: {
          queue: true
        }
      }
    }
  })

  if (!booking) {
    const checkOnlyBookingId = await db.booking.findFirst({
      where: {
        id: data.bookingId,
        status: 'booked'
      },
      select: {
        scheduleDate: true
      }
    })

    if (checkOnlyBookingId) {
      throw createError({
        statusCode: 400,
        statusMessage: `Booking ini untuk tanggal ${checkOnlyBookingId.scheduleDate.toISOString().split('T')[0]}. Hanya bisa check-in di hari yang sama.`
      })
    }

    throw createError({
      statusCode: 404,
      statusMessage: 'Booking not found or already processed'
    })
  }

  if (booking.checkIn?.queue) {
    return ok({
      queue: booking.checkIn.queue,
      reused: true
    })
  }

  const queue = await db.$transaction(async (tx) => {
    const existingCheckIn = await tx.checkIn.findUnique({
      where: { bookingId: booking.id },
      include: { queue: true }
    })

    if (existingCheckIn?.queue) {
      return existingCheckIn.queue
    }

    const checkIn = existingCheckIn ?? await tx.checkIn.create({
      data: {
        bookingId: booking.id,
        staffUserId: session.user.id,
        checkInMethod: data.checkInMethod
      }
    })

    const totalQueueToday = await tx.queue.count({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      }
    })

    const queueNumber = formatQueueNumber(totalQueueToday + 1)

    const createdQueue = await tx.queue.create({
      data: {
        checkInId: checkIn.id,
        doctorId: booking.doctorId,
        queueNumber,
        status: 'waiting'
      }
    })

    await tx.booking.update({
      where: { id: booking.id },
      data: { status: 'checked_in' }
    })

    return createdQueue
  })

  return ok({
    queue,
    reused: false
  })
})
