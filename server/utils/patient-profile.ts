import { createError } from 'h3'
import { db } from '~~/server/database'

type SessionUser = {
  id: string
  name?: string | null
  email?: string | null
  role?: string | null
}

function fallbackName(user: SessionUser) {
  if (user.name?.trim()) return user.name.trim()
  if (user.email?.trim()) return user.email.split('@')[0]
  return 'Pasien Baru'
}

export async function ensurePatientProfile(user: SessionUser) {
  if (user.role !== 'patient') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Hanya role patient yang bisa memakai profil pasien'
    })
  }

  const existing = await db.patient.findFirst({
    where: { userId: user.id },
  })

  if (existing) return existing

  return db.patient.create({
    data: {
      userId: user.id,
      fullName: fallbackName(user),
      phone: '-',
    },
  })
}
