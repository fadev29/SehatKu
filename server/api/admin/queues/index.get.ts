import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const queues = await db.queue.findMany({
    include: {
      doctor: {
        select: {
          id: true,
          fullName: true,
          specialization: true,
          clinic: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      checkIn: {
        include: {
          booking: {
            include: {
              patient: {
                select: {
                  id: true,
                  fullName: true,
                  phone: true
                }
              }
            }
          }
        }
      },
      printJobs: true
    },
    orderBy: { createdAt: 'desc' }
  })

  return ok(queues)
})
