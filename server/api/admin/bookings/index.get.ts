import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const bookings = await db.booking.findMany({
    include: {
      patient: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          user: {
            select: {
              email: true
            }
          }
        }
      },
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
          },
          service: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      checkIn: {
        include: {
          queue: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return ok(bookings)
})
