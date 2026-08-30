import { z } from "zod";

const dateOnlySchema = z.iso.date();
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format jam harus HH:MM");

export const bmiSchema = z.object({
  heightCm: z.number().positive(),
  weightKg: z.number().positive(),
});

export const createBookingSchema = z.object({
  clinicId: z.string().min(1),
  doctorId: z.string().min(1),
  scheduleDate: dateOnlySchema,
  scheduleTime: timeSchema,
  heightCm: z.number().positive(),
  weightKg: z.number().positive(),
});
