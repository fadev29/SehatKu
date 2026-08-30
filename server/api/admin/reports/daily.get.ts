import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const rows = await db.booking.findMany({
    include: {
      patient: { select: { fullName: true, phone: true } },
      doctor: { select: { fullName: true } },
      checkIn: { include: { queue: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  })

  return ok(rows)
})
