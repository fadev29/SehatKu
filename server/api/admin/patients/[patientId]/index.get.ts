import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const patientId = getRouterParam(event, 'patientId')
  if (!patientId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Patient ID is required'
    })
  }

  const patient = await db.patient.findUnique({
    where: { id: patientId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true
        }
      },
      bookings: {
        include: {
          doctor: {
            select: {
              id: true,
              fullName: true,
              specialization: true
            }
          },
          checkIn: {
            include: {
              queue: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      }
    }
  })

  if (!patient) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Patient not found'
    })
  }

  return ok(patient)
})
