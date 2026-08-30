import { hashPassword } from 'better-auth/crypto'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'
import { doctorSchema } from '~~/shared/validators/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const data = doctorSchema.parse(body)

  const doctor = await db.$transaction(async (tx) => {
    let userId: string | undefined

    if (data.email) {
      const user = await tx.user.upsert({
        where: { email: data.email },
        update: {
          name: data.fullName,
          role: 'doctor',
          emailVerified: true
        },
        create: {
          email: data.email,
          name: data.fullName,
          role: 'doctor',
          emailVerified: true
        }
      })

      userId = user.id

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
    }

    return tx.doctor.create({
      data: {
        userId,
        fullName: data.fullName,
        specialization: data.specialization,
        clinicId: data.clinicId,
        serviceId: data.serviceId,
        isActive: data.isActive ?? true
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
