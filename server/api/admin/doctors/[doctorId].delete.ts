import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const doctorId = getRouterParam(event, 'doctorId')
  if (!doctorId) throw createError({ statusCode: 400, statusMessage: 'Doctor ID is required' })

  const doctor = await db.doctor.update({ where: { id: doctorId }, data: { isActive: false } })
  return ok(doctor)
})
