import { createError } from 'h3'
import { db } from '~~/server/database'
import { auth } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/api-response'
import { updatePatientProfileSchema } from '~~/shared/validators/patient'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  if (session.user.role !== 'patient') {
    throw createError({ statusCode: 403, statusMessage: 'Hanya role patient yang bisa mengubah profil pasien' })
  }

  const body = await readBody(event)
  const data = updatePatientProfileSchema.parse(body)

  const existing = await db.patient.findFirst({ where: { userId: session.user.id } })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Profil pasien belum ada' })
  }

  const patient = await db.patient.update({
    where: { id: existing.id },
    data: {
      fullName: data.fullName,
      phone: data.phone,
      user: {
        update: {
          name: data.fullName,
        },
      },
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, createdAt: true, image: true } },
      bookings: { include: { doctor: { select: { fullName: true, specialization: true } } }, orderBy: { createdAt: 'desc' } },
    },
  })

  return ok(patient)
})
