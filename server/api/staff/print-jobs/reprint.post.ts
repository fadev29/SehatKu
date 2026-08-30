import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireStaff } from '~~/server/utils/require-staff'

export default defineEventHandler(async (event) => {
  await requireStaff(event)

  const body = await readBody(event)
  const printJobId = typeof body?.printJobId === 'string' ? body.printJobId : ''

  if (!printJobId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Print job ID is required'
    })
  }

  const existing = await db.printJob.findUnique({
    where: { id: printJobId }
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Print job not found'
    })
  }

  const reprintJob = await db.printJob.create({
    data: {
      queueId: existing.queueId,
      printerProfileId: existing.printerProfileId,
      type: 'reprint',
      status: 'success',
      printedAt: new Date()
    }
  })

  return ok(reprintJob)
})
