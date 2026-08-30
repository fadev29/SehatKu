import { createError } from "h3";
import { db } from "~~/server/database";
import { auth } from "~~/server/utils/auth";
import { ok } from "~~/server/utils/api-response";
import { ensurePatientProfile } from '~~/server/utils/patient-profile'

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

  const bookings = await db.booking.findMany({
    where: { patientId: patient.id },
    include: {
      doctor: true,
      checkIn: {
        include: {
          queue: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(bookings);
});
