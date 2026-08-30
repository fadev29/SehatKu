import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const patientId = getRouterParam(event, 'patientId')
  if (!patientId) {
    throw createError({ statusCode: 400, statusMessage: 'Patient ID is required' })
  }

  const patient = await db.patient.delete({ where: { id: patientId } })
  return ok(patient)
})
