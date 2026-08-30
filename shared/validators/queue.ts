import { z } from 'zod'

export const createPrintJobSchema = z.object({
  queueId: z.string().min(1),
  printerProfileId: z.string().min(1),
  type: z.enum(['print', 'reprint']).default('print'),
  status: z.enum(['pending', 'success', 'failed']).default('success'),
  errorMessage: z.string().optional()
})

export const updateQueueStatusSchema = z.object({
  status: z.enum(['waiting', 'called', 'skipped', 'completed'])
})
