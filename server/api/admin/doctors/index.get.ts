import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const doctors = await db.doctor.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          image: true
        }
      },
      clinic: true,
      service: true
    },
    orderBy: { createdAt: 'desc' }
  })

  return ok(doctors)
})
