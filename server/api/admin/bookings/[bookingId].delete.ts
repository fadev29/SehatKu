import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const bookingId = getRouterParam(event, 'bookingId')
  if (!bookingId) {
    throw createError({ statusCode: 400, statusMessage: 'Booking ID is required' })
  }

  const booking = await db.booking.delete({ where: { id: bookingId } })
  return ok(booking)
})
