import { createError } from "h3";
import { db } from "~~/server/database";
import { auth } from "~~/server/utils/auth";
import { ok } from "~~/server/utils/api-response";
import { calculateBmi } from "~~/server/utils/bmi";
import { ensurePatientProfile } from '~~/server/utils/patient-profile'
import { generateQrToken } from "~~/server/utils/qr-token";
import { createBookingSchema } from "~~/shared/validators/booking";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const patient = await ensurePatientProfile(session.user)

  const body = await readBody(event);
  const data = createBookingSchema.parse(body);

  const bmiResult = calculateBmi(data.heightCm, data.weightKg);
  const qrToken = generateQrToken();

  const booking = await db.booking.create({
    data: {
      patientId: patient.id,
      clinicId: data.clinicId,
      doctorId: data.doctorId,
      scheduleDate: new Date(data.scheduleDate),
      scheduleTime: data.scheduleTime,
      heightCm: data.heightCm,
      weightKg: data.weightKg,
      bmiResult,
      qrToken,
      status: "booked",
    },
  });

  return ok(booking);
});
