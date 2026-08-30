import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireStaff } from '~~/server/utils/require-staff'
import { scanQrSchema } from '~~/shared/validators/staff'
import { getTodayRange } from '~~/server/utils/today-range'

export default defineEventHandler(async (event) => {
  await requireStaff(event)

  const body = await readBody(event)
  const data = scanQrSchema.parse(body)
  const { start, end } = getTodayRange()

  const booking = await db.booking.findFirst({
    where: {
      qrToken: data.qrToken,
      status: 'booked',
      scheduleDate: {
        gte: start,
        lte: end
      }
    },
    include: {
      patient: true,
      doctor: {
        include: {
          clinic: true,
          service: true,
        },
      },
      checkIn: {
        include: {
          queue: true
        }
      }
    }
  })

  if (!booking) {
    const checkOnlyQrToken = await db.booking.findFirst({
      where: {
        qrToken: data.qrToken,
        status: 'booked'
      },
      select: {
        scheduleDate: true
      }
    })

    if (checkOnlyQrToken) {
      throw createError({
        statusCode: 400,
        statusMessage: `Booking ini untuk tanggal ${checkOnlyQrToken.scheduleDate.toISOString().split('T')[0]}. Hanya bisa check-in di hari yang sama.`
      })
    }

    throw createError({
      statusCode: 404,
      statusMessage: 'Booking not found or invalid'
    })
  }

  return ok({
    bookingId: booking.id,
    patientName: booking.patient.fullName,
    doctorName: booking.doctor.fullName,
    clinicName: booking.doctor.clinic?.name || 'Sehatku',
    serviceName: booking.doctor.service?.name || '-',
    scheduleDate: booking.scheduleDate,
    scheduleTime: booking.scheduleTime,
    qrToken: booking.qrToken,
    bmiResult: booking.bmiResult,
    alreadyCheckedIn: Boolean(booking.checkIn),
    queue: booking.checkIn?.queue ?? null
  })
})
