import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireStaff } from '~~/server/utils/require-staff'
import { createPrintJobSchema } from '~~/shared/validators/queue'

export default defineEventHandler(async (event) => {
  await requireStaff(event)

  const body = await readBody(event)
  const data = createPrintJobSchema.parse(body)

  const queue = await db.queue.findUnique({
    where: { id: data.queueId }
  })

  if (!queue) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Queue not found'
    })
  }

  const printerProfile = await db.printerProfile.findUnique({
    where: { id: data.printerProfileId }
  })

  if (!printerProfile) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Printer profile not found'
    })
  }

  const printJob = await db.printJob.create({
    data: {
      queueId: data.queueId,
      printerProfileId: data.printerProfileId,
      type: data.type,
      status: data.status,
      errorMessage: data.errorMessage,
      printedAt: data.status === 'success' ? new Date() : null
    }
  })

  return ok(printJob)
})
