import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const schedules = await db.schedule.findMany({
    where: {
      isActive: true,
      doctorId: typeof query.doctorId === 'string' ? query.doctorId : undefined,
      scheduleDate: typeof query.date === 'string' ? new Date(query.date) : undefined,
      doctor: {
        isActive: true,
        clinicId: typeof query.clinicId === 'string' ? query.clinicId : undefined
      }
    },
    include: {
      doctor: {
        include: {
          clinic: {
            select: {
              id: true,
              name: true
            }
          },
          service: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    },
    orderBy: [
      { scheduleDate: 'asc' },
      { startTime: 'asc' }
    ]
  })

  return ok(schedules)
})
