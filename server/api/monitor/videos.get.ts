import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'

export default defineEventHandler(async () => {
  const videos = await db.monitorAd.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  })

  return ok(videos)
})
