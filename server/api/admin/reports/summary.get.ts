import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const [booked, checkedIn, cancelled, expired, waiting, called, skipped, completed, printSuccess, printFailed] = await Promise.all([
    db.booking.count({ where: { status: 'booked' } }),
    db.booking.count({ where: { status: 'checked_in' } }),
    db.booking.count({ where: { status: 'cancelled' } }),
    db.booking.count({ where: { status: 'expired' } }),
    db.queue.count({ where: { status: 'waiting' } }),
    db.queue.count({ where: { status: 'called' } }),
    db.queue.count({ where: { status: 'skipped' } }),
    db.queue.count({ where: { status: 'completed' } }),
    db.printJob.count({ where: { status: 'success' } }),
    db.printJob.count({ where: { status: 'failed' } })
  ])

  return ok({
    bookings: { booked, checkedIn, cancelled, expired },
    queues: { waiting, called, skipped, completed },
    prints: { success: printSuccess, failed: printFailed }
  })
})
