import { createError } from 'h3'
import { db } from '~~/server/database'
import { auth } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/api-response'
import { ensurePatientProfile } from '~~/server/utils/patient-profile'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.headers,
  })

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const ensuredPatient = await ensurePatientProfile(session.user)

  const patient = await db.patient.findUniqueOrThrow({
    where: { id: ensuredPatient.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          image: true,
        },
      },
      bookings: {
        include: {
          doctor: {
            select: {
              fullName: true,
              specialization: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  return ok(patient)
})
