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
    throw createError({ statusCode: 403, statusMessage: 'Hanya role patient yang bisa membuat profil pasien' })
  }

  const existing = await db.patient.findFirst({ where: { userId: session.user.id } })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Profil pasien sudah ada' })
  }

  const body = await readBody(event)
  const data = updatePatientProfileSchema.parse(body)

  const patient = await db.patient.create({
    data: {
      userId: session.user.id,
      fullName: data.fullName,
      phone: data.phone
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, createdAt: true, image: true } },
      bookings: { include: { doctor: { select: { fullName: true, specialization: true } } }, orderBy: { createdAt: 'desc' } }
    }
  })

  return ok(patient)
})
