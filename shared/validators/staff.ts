import { z } from 'zod'

export const scanQrSchema = z.object({
  qrToken: z.string().uuid('QR token harus UUID valid')
})

export const manualSearchSchema = z.object({
  keyword: z.string().trim().min(1)
})

export const createQueueSchema = z.object({
  bookingId: z.string().min(1),
  checkInMethod: z.enum(['qr', 'manual']).default('qr')
})
