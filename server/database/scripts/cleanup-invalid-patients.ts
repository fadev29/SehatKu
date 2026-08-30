import 'dotenv/config'
import { db } from '../index'

async function main() {
  const invalidPatients = await db.patient.findMany({
    where: {
      user: {
        role: {
          not: 'patient'
        }
      }
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true
        }
      },
      bookings: {
        include: {
          checkIn: {
            include: {
              queue: {
                include: {
                  printJobs: {
                    select: { id: true }
                  }
                }
              }
            }
          }
        }
      }
    }
  })

  if (!invalidPatients.length) {
    console.log('Tidak ada data patient salah role. Bersih.')
    return
  }

  const summary = invalidPatients.map((patient) => ({
    patientId: patient.id,
    userId: patient.userId,
    email: patient.user.email,
    role: patient.user.role,
    bookings: patient.bookings.length,
    checkIns: patient.bookings.filter((booking) => booking.checkIn).length,
    queues: patient.bookings.filter((booking) => booking.checkIn?.queue).length,
    printJobs: patient.bookings.reduce((total, booking) => total + (booking.checkIn?.queue?.printJobs.length ?? 0), 0)
  }))

  console.table(summary)

  await db.$transaction([
    db.patient.deleteMany({
      where: {
        id: {
          in: invalidPatients.map((patient) => patient.id)
        }
      }
    })
  ])

  console.log(`Cleanup selesai. ${invalidPatients.length} data patient salah role dihapus.`)
}

main()
  .catch((error) => {
    console.error('Cleanup gagal:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
