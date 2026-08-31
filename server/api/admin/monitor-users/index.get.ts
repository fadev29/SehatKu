import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const users = await db.user.findMany({
    where: {
      role: 'monitor'
    },
    include: {
      monitorClinic: true
    },
    orderBy: { createdAt: 'desc' }
  })

  return ok(users)
})
