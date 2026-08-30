import QRCode from 'qrcode'
import { createError, setHeader } from 'h3'
import { db } from '~~/server/database'
import { auth } from '~~/server/utils/auth'
import { ensurePatientProfile } from '~~/server/utils/patient-profile'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const patient = await ensurePatientProfile(session.user)
  const bookingId = getRouterParam(event, 'bookingId')

  if (!bookingId) {
    throw createError({ statusCode: 400, statusMessage: 'Booking ID is required' })
  }

  const booking = await db.booking.findFirst({
    where: {
      id: bookingId,
      patientId: patient.id,
    },
    select: {
      qrToken: true,
    },
  })

  if (!booking?.qrToken) {
    throw createError({ statusCode: 404, statusMessage: 'QR booking not found' })
  }

  const size = Math.min(Math.max(Number(getQuery(event).size || 240), 160), 512)
  const svg = await QRCode.toString(booking.qrToken, {
    type: 'svg',
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  })

  setHeader(event, 'content-type', 'image/svg+xml; charset=utf-8')
  setHeader(event, 'cache-control', 'private, max-age=300')
  return svg
})
