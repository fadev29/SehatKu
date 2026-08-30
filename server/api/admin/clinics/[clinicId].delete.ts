import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const clinicId = getRouterParam(event, 'clinicId')
  if (!clinicId) throw createError({ statusCode: 400, statusMessage: 'Clinic ID is required' })

  const clinic = await db.clinic.update({ where: { id: clinicId }, data: { isActive: false } })
  return ok(clinic)
})
