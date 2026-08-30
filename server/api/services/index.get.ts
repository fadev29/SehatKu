import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const services = await db.service.findMany({
    where: {
      isActive: true,
      clinicId: typeof query.clinicId === 'string' ? query.clinicId : undefined,
      clinic: {
        isActive: true
      }
    },
    include: {
      clinic: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: [
      { clinicId: 'asc' },
      { name: 'asc' }
    ]
  })

  return ok(services)
})
