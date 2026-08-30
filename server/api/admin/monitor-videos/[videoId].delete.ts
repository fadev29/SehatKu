import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const videoId = getRouterParam(event, 'videoId')
  if (!videoId) throw createError({ statusCode: 400, statusMessage: 'Video ID is required' })

  const video = await db.monitorAd.update({ where: { id: videoId }, data: { isActive: false } })
  return ok(video)
})
