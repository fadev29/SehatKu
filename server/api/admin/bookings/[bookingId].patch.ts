import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'
import { adminBookingSchema } from '~~/shared/validators/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const bookingId = getRouterParam(event, 'bookingId')
  if (!bookingId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Booking ID is required'
    })
  }

  const body = await readBody(event)
  const data = adminBookingSchema.parse(body)

  const booking = await db.booking.update({
    where: { id: bookingId },
    data: {
      ...(data.status ? { status: data.status } : {}),
      ...(data.scheduleDate ? { scheduleDate: new Date(data.scheduleDate) } : {}),
      ...(data.scheduleTime ? { scheduleTime: data.scheduleTime } : {}),
      ...(data.doctorId ? { doctorId: data.doctorId } : {})
    },
    include: {
      patient: true,
      doctor: true,
      checkIn: {
        include: {
          queue: true
        }
      }
    }
  })

  return ok(booking)
})
