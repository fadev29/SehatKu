import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const days = 7
  const today = startOfDay(new Date())
  const result = [] as Array<{ date: string, bookings: number, checkIns: number, queuesCompleted: number }>

  for (let index = days - 1; index >= 0; index--) {
    const start = new Date(today)
    start.setDate(today.getDate() - index)
    const end = new Date(start)
    end.setDate(start.getDate() + 1)

    const [bookings, checkIns, queuesCompleted] = await Promise.all([
      db.booking.count({ where: { createdAt: { gte: start, lt: end } } }),
      db.checkIn.count({ where: { checkedInAt: { gte: start, lt: end } } }),
      db.queue.count({ where: { completedAt: { gte: start, lt: end } } })
    ])

    result.push({
      date: start.toISOString().split('T')[0],
      bookings,
      checkIns,
      queuesCompleted
    })
  }

  return ok(result)
})
