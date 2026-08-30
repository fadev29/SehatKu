import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const printerProfileId = getRouterParam(event, 'printerProfileId')
  if (!printerProfileId) throw createError({ statusCode: 400, statusMessage: 'Printer profile ID is required' })

  const printerProfile = await db.printerProfile.update({ where: { id: printerProfileId }, data: { isActive: false } })
  return ok(printerProfile)
})
