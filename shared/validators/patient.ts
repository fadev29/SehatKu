import { z } from 'zod'

export const updatePatientProfileSchema = z.object({
  fullName: z.string().trim().min(1),
  phone: z.string().trim().min(8)
})
