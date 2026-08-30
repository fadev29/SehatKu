import { createError } from 'h3'
import { hashPassword } from 'better-auth/crypto'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'
import { doctorSchema } from '~~/shared/validators/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const doctorId = getRouterParam(event, 'doctorId')
  if (!doctorId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Doctor ID is required'
    })
  }

  const body = await readBody(event)
  const data = doctorSchema.partial().parse(body)

  const doctor = await db.$transaction(async (tx) => {
    const existingDoctor = await tx.doctor.findUnique({
      where: { id: doctorId },
      select: { userId: true }
    })

    if (!existingDoctor) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Doctor not found'
      })
    }

    let nextUserId = existingDoctor.userId ?? undefined

    if (data.email) {
      const user = await tx.user.upsert({
        where: { email: data.email },
        update: {
          ...(data.fullName ? { name: data.fullName } : {}),
          role: 'doctor',
          emailVerified: true
        },
        create: {
          email: data.email,
          name: data.fullName ?? 'Doctor',
          role: 'doctor',
          emailVerified: true
        }
      })

      nextUserId = user.id

      if (data.password) {
        const passwordHash = await hashPassword(data.password)
        await tx.account.upsert({
          where: {
            issuer_accountId: {
              issuer: 'local:credential',
              accountId: user.id
            }
          },
          update: {
            password: passwordHash,
            providerId: 'credential'
          },
          create: {
            userId: user.id,
            issuer: 'local:credential',
            accountId: user.id,
            providerId: 'credential',
            password: passwordHash
          }
        })
      }
    } else if (existingDoctor.userId && (data.fullName || data.password)) {
      if (data.fullName) {
        await tx.user.update({
          where: { id: existingDoctor.userId },
          data: { name: data.fullName }
        })
      }

      if (data.password) {
        const passwordHash = await hashPassword(data.password)
        await tx.account.upsert({
          where: {
            issuer_accountId: {
              issuer: 'local:credential',
              accountId: existingDoctor.userId
            }
          },
          update: {
            password: passwordHash,
            providerId: 'credential'
          },
          create: {
            userId: existingDoctor.userId,
            issuer: 'local:credential',
            accountId: existingDoctor.userId,
            providerId: 'credential',
            password: passwordHash
          }
        })
      }
    }

    return tx.doctor.update({
      where: { id: doctorId },
      data: {
        ...(typeof nextUserId !== 'undefined' ? { userId: nextUserId } : {}),
        ...(data.fullName ? { fullName: data.fullName } : {}),
        ...(typeof data.specialization !== 'undefined' ? { specialization: data.specialization } : {}),
        ...(data.clinicId ? { clinicId: data.clinicId } : {}),
        ...(data.serviceId ? { serviceId: data.serviceId } : {}),
        ...(typeof data.isActive !== 'undefined' ? { isActive: data.isActive } : {})
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        clinic: true,
        service: true
      }
    })
  })

  return ok(doctor)
})
