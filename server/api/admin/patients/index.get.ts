import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const patients = await db.patient.findMany({
    where: {
      user: {
        role: 'patient'
      }
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          emailVerified: true,
          createdAt: true,
          image: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return ok(patients)
})
