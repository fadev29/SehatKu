import { createError } from 'h3'
import { hashPassword } from 'better-auth/crypto'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'
import { adminPatientSchema } from '~~/shared/validators/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const patientId = getRouterParam(event, 'patientId')
  if (!patientId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Patient ID is required'
    })
  }

  const body = await readBody(event)
  const data = adminPatientSchema.partial().parse(body)

  const existingPatient = await db.patient.findUnique({
    where: { id: patientId },
    select: { userId: true }
  })

  if (!existingPatient) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Patient not found'
    })
  }

  const patient = await db.patient.update({
    where: { id: patientId },
    data: {
      ...(data.fullName ? { fullName: data.fullName } : {}),
      ...(data.phone ? { phone: data.phone } : {}),
      user: {
        update: {
          ...(data.fullName ? { name: data.fullName } : {}),
          ...(data.email ? { email: data.email } : {})
        }
      }
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          emailVerified: true
        }
      }
    }
  })

  if (data.password) {
    const passwordHash = await hashPassword(data.password)

    await db.account.upsert({
      where: {
        issuer_accountId: {
          issuer: 'local:credential',
          accountId: existingPatient.userId
        }
      },
      update: {
        password: passwordHash,
        providerId: 'credential'
      },
      create: {
        userId: existingPatient.userId,
        issuer: 'local:credential',
        accountId: existingPatient.userId,
        providerId: 'credential',
        password: passwordHash
      }
    })
  }

  return ok(patient)
})
