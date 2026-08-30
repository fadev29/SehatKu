import { z } from 'zod'

const dateOnlySchema = z.iso.date()
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format jam harus HH:MM')
const bluetoothUuidSchema = z.string().uuid('UUID harus format RFC 4122, mis. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')
const writeModeSchema = z.enum(['chunk', 'bulk'])

const youtubeUrlSchema = z.string().url().refine((value) => {
  const { hostname, pathname } = new URL(value)
  const normalizedHost = hostname.toLowerCase()

  if (normalizedHost === 'youtu.be') {
    return pathname.length > 1
  }

  return normalizedHost === 'youtube.com'
    || normalizedHost === 'www.youtube.com'
    || normalizedHost === 'm.youtube.com'
}
, 'URL harus URL YouTube valid')

export const clinicSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  isActive: z.boolean().optional()
})

export const serviceSchema = z.object({
  clinicId: z.string().min(1),
  name: z.string().min(1),
  isActive: z.boolean().optional()
})

export const doctorSchema = z.object({
  fullName: z.string().min(1),
  specialization: z.string().optional(),
  clinicId: z.string().min(1),
  serviceId: z.string().min(1),
  isActive: z.boolean().optional(),
  email: z.string().trim().email().optional(),
  password: z.string().min(8).optional()
})

export const scheduleSchema = z.object({
  doctorId: z.string().min(1),
  scheduleDate: dateOnlySchema,
  startTime: timeSchema,
  endTime: timeSchema,
  quota: z.number().int().positive(),
  isActive: z.boolean().optional()
}).refine((data) => data.startTime < data.endTime, {
  message: 'Jam mulai harus sebelum jam selesai',
  path: ['endTime']
})

export const printerProfileSchema = z.object({
  name: z.string().min(1),
  serviceUuid: bluetoothUuidSchema,
  characteristicUuid: bluetoothUuidSchema,
  writeMode: writeModeSchema.optional(),
  isActive: z.boolean().optional()
})

export const monitorAdSchema = z.object({
  title: z.string().min(1),
  youtubeUrl: youtubeUrlSchema,
  isActive: z.boolean().optional()
})

export const adminStaffSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(8).optional(),
  role: z.literal('staff').default('staff')
})

export const adminPatientSchema = z.object({
  fullName: z.string().trim().min(1),
  phone: z.string().trim().min(8),
  email: z.string().trim().email().optional(),
  password: z.string().min(8).optional()
})

export const adminBookingSchema = z.object({
  status: z.enum(['booked', 'checked_in', 'cancelled', 'expired']).optional(),
  scheduleDate: dateOnlySchema.optional(),
  scheduleTime: timeSchema.optional(),
  doctorId: z.string().min(1).optional()
})

export const adminQueueSchema = z.object({
  status: z.enum(['waiting', 'called', 'skipped', 'completed']),
  queueNumber: z.string().min(1).optional()
})
