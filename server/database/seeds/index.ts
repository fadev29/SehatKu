import 'dotenv/config'
import { hashPassword } from 'better-auth/crypto'
import { db } from '../index'

type SeedRole = 'admin' | 'staff' | 'doctor' | 'monitor' | 'patient'

type SeedUser = {
  email: string
  name: string
  role: SeedRole
  password: string
}

async function upsertCredentialUser(input: SeedUser) {
  const passwordHash = await hashPassword(input.password)

  const user = await db.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      role: input.role,
      emailVerified: true
    },
    create: {
      email: input.email,
      name: input.name,
      role: input.role,
      emailVerified: true
    }
  })

  await db.account.upsert({
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

  return user
}

function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, offset: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + offset)
  return next
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL atau ADMIN_PASSWORD belum di-set')
  }

  const sharedPassword = process.env.DUMMY_USER_PASSWORD || 'password123'

  const users: SeedUser[] = [
    { email: adminEmail, name: 'Admin Sehatku', role: 'admin', password: adminPassword },
    { email: 'staff@sehatku.local', name: 'Staff Sehatku', role: 'staff', password: sharedPassword },
    { email: 'monitor@sehatku.local', name: 'Monitor Sehatku', role: 'monitor', password: sharedPassword },
    { email: 'dokter.umum@sehatku.local', name: 'Dokter Sehatku', role: 'doctor', password: sharedPassword },
    { email: 'dokter.gigi@sehatku.local', name: 'drg. Rina Amalia', role: 'doctor', password: sharedPassword },
    { email: 'dokter.anak@sehatku.local', name: 'dr. Sarah Nabila', role: 'doctor', password: sharedPassword },
    { email: 'pasien1@sehatku.local', name: 'Siti Nurbaya', role: 'patient', password: sharedPassword },
    { email: 'pasien2@sehatku.local', name: 'Budi Waluyo', role: 'patient', password: sharedPassword },
    { email: 'pasien3@sehatku.local', name: 'Rina Melati', role: 'patient', password: sharedPassword },
    { email: 'pasien4@sehatku.local', name: 'Dewi Wulandari', role: 'patient', password: sharedPassword }
  ]

  const seededUsers = new Map<string, Awaited<ReturnType<typeof upsertCredentialUser>>>()
  for (const user of users) {
    seededUsers.set(user.email, await upsertCredentialUser(user))
  }

  const clinicPusat = await db.clinic.upsert({
    where: { id: 'seed-clinic-pusat' },
    update: { name: 'Sehatku Pusat', address: 'Jl. Kesehatan Raya No. 123, Jakarta Selatan', isActive: true },
    create: { id: 'seed-clinic-pusat', name: 'Sehatku Pusat', address: 'Jl. Kesehatan Raya No. 123, Jakarta Selatan', isActive: true }
  })

  const clinicUtara = await db.clinic.upsert({
    where: { id: 'seed-clinic-utara' },
    update: { name: 'Sehatku Cabang Utara', address: 'Jl. Danau Sunter No. 8, Jakarta Utara', isActive: true },
    create: { id: 'seed-clinic-utara', name: 'Sehatku Cabang Utara', address: 'Jl. Danau Sunter No. 8, Jakarta Utara', isActive: true }
  })

  const serviceUmum = await db.service.upsert({
    where: { id: 'seed-service-umum' },
    update: { clinicId: clinicPusat.id, name: 'Poli Umum', isActive: true },
    create: { id: 'seed-service-umum', clinicId: clinicPusat.id, name: 'Poli Umum', isActive: true }
  })

  const serviceGigi = await db.service.upsert({
    where: { id: 'seed-service-gigi' },
    update: { clinicId: clinicPusat.id, name: 'Poli Gigi', isActive: true },
    create: { id: 'seed-service-gigi', clinicId: clinicPusat.id, name: 'Poli Gigi', isActive: true }
  })

  const serviceAnak = await db.service.upsert({
    where: { id: 'seed-service-anak' },
    update: { clinicId: clinicUtara.id, name: 'Poli Anak', isActive: true },
    create: { id: 'seed-service-anak', clinicId: clinicUtara.id, name: 'Poli Anak', isActive: true }
  })

  const doctorUtamaUser = seededUsers.get('dokter.umum@sehatku.local')
  const doctorGigiUser = seededUsers.get('dokter.gigi@sehatku.local')
  const doctorAnakUser = seededUsers.get('dokter.anak@sehatku.local')
  if (!doctorUtamaUser || !doctorGigiUser || !doctorAnakUser) {
    throw new Error('Akun dokter seed tidak lengkap')
  }

  const doctorUtama = await db.doctor.upsert({
    where: { id: 'seed-doctor-utama' },
    update: { userId: doctorUtamaUser.id, fullName: 'Dokter Sehatku', specialization: 'Dokter Umum', clinicId: clinicPusat.id, serviceId: serviceUmum.id, isActive: true },
    create: { id: 'seed-doctor-utama', userId: doctorUtamaUser.id, fullName: 'Dokter Sehatku', specialization: 'Dokter Umum', clinicId: clinicPusat.id, serviceId: serviceUmum.id, isActive: true }
  })

  const doctorGigi = await db.doctor.upsert({
    where: { id: 'seed-doctor-gigi' },
    update: { userId: doctorGigiUser.id, fullName: 'drg. Rina Amalia', specialization: 'Dokter Gigi', clinicId: clinicPusat.id, serviceId: serviceGigi.id, isActive: true },
    create: { id: 'seed-doctor-gigi', userId: doctorGigiUser.id, fullName: 'drg. Rina Amalia', specialization: 'Dokter Gigi', clinicId: clinicPusat.id, serviceId: serviceGigi.id, isActive: true }
  })

  const doctorAnak = await db.doctor.upsert({
    where: { id: 'seed-doctor-anak' },
    update: { userId: doctorAnakUser.id, fullName: 'dr. Sarah Nabila', specialization: 'Dokter Anak', clinicId: clinicUtara.id, serviceId: serviceAnak.id, isActive: true },
    create: { id: 'seed-doctor-anak', userId: doctorAnakUser.id, fullName: 'dr. Sarah Nabila', specialization: 'Dokter Anak', clinicId: clinicUtara.id, serviceId: serviceAnak.id, isActive: true }
  })

  const today = startOfDay()
  const tomorrow = addDays(today, 1)

  const scheduleSeeds = [
    { id: 'seed-schedule-1', doctorId: doctorUtama.id, scheduleDate: today, startTime: '08:00', endTime: '12:00', quota: 20 },
    { id: 'seed-schedule-2', doctorId: doctorGigi.id, scheduleDate: today, startTime: '09:00', endTime: '13:00', quota: 12 },
    { id: 'seed-schedule-3', doctorId: doctorAnak.id, scheduleDate: today, startTime: '10:00', endTime: '14:00', quota: 14 },
    { id: 'seed-schedule-4', doctorId: doctorUtama.id, scheduleDate: tomorrow, startTime: '08:00', endTime: '12:00', quota: 20 }
  ]

  for (const item of scheduleSeeds) {
    await db.schedule.upsert({
      where: { id: item.id },
      update: { ...item, isActive: true },
      create: { ...item, isActive: true }
    })
  }

  const patientSeeds = [
    { id: 'seed-patient-1', userEmail: 'pasien1@sehatku.local', fullName: 'Siti Nurbaya', phone: '081234567890' },
    { id: 'seed-patient-2', userEmail: 'pasien2@sehatku.local', fullName: 'Budi Waluyo', phone: '081234567891' },
    { id: 'seed-patient-3', userEmail: 'pasien3@sehatku.local', fullName: 'Rina Melati', phone: '081234567892' },
    { id: 'seed-patient-4', userEmail: 'pasien4@sehatku.local', fullName: 'Dewi Wulandari', phone: '081234567893' }
  ]

  const patients = [] as Array<{ id: string; fullName: string; phone: string }>
  for (const item of patientSeeds) {
    const user = seededUsers.get(item.userEmail)
    if (!user) continue
    const patient = await db.patient.upsert({
      where: { userId: user.id },
      update: { fullName: item.fullName, phone: item.phone },
      create: { id: item.id, userId: user.id, fullName: item.fullName, phone: item.phone }
    })
    patients.push(patient)
  }

  const staffUser = seededUsers.get('staff@sehatku.local')
  if (!staffUser) throw new Error('User staff seed tidak ditemukan')

  const printerFrontdesk = await db.printerProfile.upsert({
    where: { id: 'seed-printer-frontdesk' },
    update: { name: 'RPP02N Frontdesk', serviceUuid: '000018f0-0000-1000-8000-00805f9b34fb', characteristicUuid: '00002af1-0000-1000-8000-00805f9b34fb', writeMode: 'chunk', isActive: true },
    create: { id: 'seed-printer-frontdesk', name: 'RPP02N Frontdesk', serviceUuid: '000018f0-0000-1000-8000-00805f9b34fb', characteristicUuid: '00002af1-0000-1000-8000-00805f9b34fb', writeMode: 'chunk', isActive: true }
  })

  await db.printerProfile.upsert({
    where: { id: 'seed-printer-kasir' },
    update: { name: 'RPP02N Kasir', serviceUuid: '000018f0-0000-1000-8000-00805f9b34fb', characteristicUuid: '00002af1-0000-1000-8000-00805f9b34fc', writeMode: 'chunk', isActive: true },
    create: { id: 'seed-printer-kasir', name: 'RPP02N Kasir', serviceUuid: '000018f0-0000-1000-8000-00805f9b34fb', characteristicUuid: '00002af1-0000-1000-8000-00805f9b34fc', writeMode: 'chunk', isActive: true }
  })

  const bookingSeeds = [
    { id: 'seed-booking-1', patientId: patients[0]?.id, clinicId: clinicPusat.id, doctorId: doctorUtama.id, scheduleDate: today, scheduleTime: '09:00', heightCm: 160, weightKg: 55, bmiResult: 21.5, qrToken: '11111111-1111-4111-8111-111111111111', status: 'checked_in' as const },
    { id: 'seed-booking-2', patientId: patients[1]?.id, clinicId: clinicPusat.id, doctorId: doctorUtama.id, scheduleDate: today, scheduleTime: '09:30', heightCm: 170, weightKg: 72, bmiResult: 24.9, qrToken: '22222222-2222-4222-8222-222222222222', status: 'booked' as const },
    { id: 'seed-booking-3', patientId: patients[2]?.id, clinicId: clinicPusat.id, doctorId: doctorGigi.id, scheduleDate: today, scheduleTime: '10:00', heightCm: 158, weightKg: 60, bmiResult: 24.0, qrToken: '33333333-3333-4333-8333-333333333333', status: 'checked_in' as const },
    { id: 'seed-booking-4', patientId: patients[3]?.id, clinicId: clinicUtara.id, doctorId: doctorAnak.id, scheduleDate: today, scheduleTime: '10:30', heightCm: 162, weightKg: 58, bmiResult: 22.1, qrToken: '44444444-4444-4444-8444-444444444444', status: 'cancelled' as const }
  ].filter((item) => item.patientId)

  for (const item of bookingSeeds) {
    await db.booking.upsert({
      where: { id: item.id },
      update: item,
      create: item
    })
  }

  const checkIn1 = await db.checkIn.upsert({
    where: { bookingId: 'seed-booking-1' },
    update: { staffUserId: staffUser.id, checkInMethod: 'qr', checkedInAt: new Date() },
    create: { bookingId: 'seed-booking-1', staffUserId: staffUser.id, checkInMethod: 'qr', checkedInAt: new Date() }
  })

  const checkIn2 = await db.checkIn.upsert({
    where: { bookingId: 'seed-booking-3' },
    update: { staffUserId: staffUser.id, checkInMethod: 'manual', checkedInAt: new Date() },
    create: { bookingId: 'seed-booking-3', staffUserId: staffUser.id, checkInMethod: 'manual', checkedInAt: new Date() }
  })

  const queue1 = await db.queue.upsert({
    where: { checkInId: checkIn1.id },
    update: { doctorId: doctorUtama.id, queueNumber: 'A-001', status: 'called', calledAt: new Date() },
    create: { checkInId: checkIn1.id, doctorId: doctorUtama.id, queueNumber: 'A-001', status: 'called', calledAt: new Date() }
  })

  await db.queue.upsert({
    where: { checkInId: checkIn2.id },
    update: { doctorId: doctorGigi.id, queueNumber: 'B-001', status: 'waiting' },
    create: { checkInId: checkIn2.id, doctorId: doctorGigi.id, queueNumber: 'B-001', status: 'waiting' }
  })

  await db.printJob.upsert({
    where: { id: 'seed-print-1' },
    update: { queueId: queue1.id, printerProfileId: printerFrontdesk.id, type: 'print', status: 'success', printedAt: new Date() },
    create: { id: 'seed-print-1', queueId: queue1.id, printerProfileId: printerFrontdesk.id, type: 'print', status: 'success', printedAt: new Date() }
  })

  await db.printJob.upsert({
    where: { id: 'seed-print-2' },
    update: { queueId: queue1.id, printerProfileId: printerFrontdesk.id, type: 'reprint', status: 'success', printedAt: new Date() },
    create: { id: 'seed-print-2', queueId: queue1.id, printerProfileId: printerFrontdesk.id, type: 'reprint', status: 'success', printedAt: new Date() }
  })

  await db.monitorAd.upsert({
    where: { id: 'seed-monitor-ad-1' },
    update: { title: 'Edukasi Jantung Sehat', youtubeUrl: 'https://www.youtube.com/watch?v=-sbCmdHEEs4', isActive: true },
    create: { id: 'seed-monitor-ad-1', title: 'Edukasi Jantung Sehat', youtubeUrl: 'https://www.youtube.com/watch?v=-sbCmdHEEs4', isActive: true }
  })

  await db.monitorAd.upsert({
    where: { id: 'seed-monitor-ad-2' },
    update: { title: 'Pola Makan Seimbang', youtubeUrl: 'https://www.youtube.com/watch?v=7g9f9k0l2Y8', isActive: true },
    create: { id: 'seed-monitor-ad-2', title: 'Pola Makan Seimbang', youtubeUrl: 'https://www.youtube.com/watch?v=7g9f9k0l2Y8', isActive: true }
  })

  console.log('Seed data dummy selesai')
  console.table(users.map((user) => ({ email: user.email, role: user.role, password: user.password })))
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
