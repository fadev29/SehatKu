import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const scheduleId = getRouterParam(event, 'scheduleId')
  if (!scheduleId) throw createError({ statusCode: 400, statusMessage: 'Schedule ID is required' })

  const schedule = await db.schedule.update({ where: { id: scheduleId }, data: { isActive: false } })
  return ok(schedule)
})
