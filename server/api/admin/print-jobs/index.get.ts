import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const printJobs = await db.printJob.findMany({
    include: {
      queue: true,
      printerProfile: true
    },
    orderBy: { createdAt: 'desc' }
  })

  return ok(printJobs)
})
