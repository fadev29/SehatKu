import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const [clinics, doctors, schedules, patients, bookings, checkedIn, queuesWaiting, queuesCalled, queuesCompleted] = await Promise.all([
    db.clinic.count({ where: { isActive: true } }),
    db.doctor.count({ where: { isActive: true } }),
    db.schedule.count({ where: { isActive: true } }),
    db.patient.count(),
    db.booking.count(),
    db.booking.count({ where: { status: 'checked_in' } }),
    db.queue.count({ where: { status: 'waiting' } }),
    db.queue.count({ where: { status: 'called' } }),
    db.queue.count({ where: { status: 'completed' } })
  ])

  return ok({
    clinics,
    doctors,
    schedules,
    patients,
    bookings,
    checkedIn,
    queues: {
      waiting: queuesWaiting,
      called: queuesCalled,
      completed: queuesCompleted
    }
  })
})
