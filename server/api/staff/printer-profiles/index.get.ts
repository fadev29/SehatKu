import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireStaff } from '~~/server/utils/require-staff'

export default defineEventHandler(async (event) => {
  await requireStaff(event)

  const profiles = await db.printerProfile.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  })

  return ok(profiles)
})
