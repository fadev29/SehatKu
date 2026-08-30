import { createError } from 'h3'
import { db } from '~~/server/database'
import { auth } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/api-response'
import { ensurePatientProfile } from '~~/server/utils/patient-profile'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.headers
  })

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const patient = await ensurePatientProfile(session.user)

  const bookingId = getRouterParam(event, 'bookingId')
  if (!bookingId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Booking ID is required'
    })
  }

  const booking = await db.booking.findFirst({
    where: {
      id: bookingId,
      patientId: patient.id
    },
    include: {
      checkIn: true
    }
  })

  if (!booking) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Booking not found'
    })
  }

  if (booking.status !== 'booked') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Booking tidak bisa dibatalkan pada status ini'
    })
  }

  if (booking.checkIn) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Booking yang sudah check-in tidak bisa dibatalkan'
    })
  }

  const updatedBooking = await db.booking.update({
    where: { id: booking.id },
    data: { status: 'cancelled' }
  })

  return ok(updatedBooking)
})
