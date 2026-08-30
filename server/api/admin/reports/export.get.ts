import { setHeader } from 'h3'
import { db } from '~~/server/database'
import { requireAdmin } from '~~/server/utils/require-admin'

function escapeCsv(value: unknown) {
  const text = String(value ?? '')
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const rows = await db.booking.findMany({
    include: {
      patient: {
        select: {
          fullName: true,
          phone: true
        }
      },
      doctor: {
        select: {
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
    take: 500
  })

  const csv = [
    ['bookingId', 'patientName', 'phone', 'doctorName', 'specialization', 'scheduleDate', 'scheduleTime', 'bookingStatus', 'queueNumber', 'queueStatus'],
    ...rows.map((row) => [
      row.id,
      row.patient.fullName,
      row.patient.phone,
      row.doctor.fullName,
      row.doctor.specialization ?? '',
      row.scheduleDate.toISOString().split('T')[0],
      row.scheduleTime,
      row.status,
      row.checkIn?.queue?.queueNumber ?? '',
      row.checkIn?.queue?.status ?? ''
    ])
  ].map((columns) => columns.map(escapeCsv).join(',')).join('\n')

  setHeader(event, 'content-type', 'text/csv; charset=utf-8')
  setHeader(event, 'content-disposition', 'attachment; filename="laporan-booking-sehatku.csv"')

  return csv
})
