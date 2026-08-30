# Phase 3 — Booking Patient dan QR Token

## Overview Flow

1. Buat endpoint public list clinic dan doctor
2. Buat validator booking patient
3. Buat util hitung BMI
4. Buat util generate QR token
5. Buat endpoint create booking
6. Buat endpoint list booking milik patient
7. Buat endpoint detail booking
8. Test alur booking end-to-end

---

## Step 1 — Tujuan Phase 3

Setelah `Phase 2` selesai, project sudah punya:

- master data clinic
- master data service
- master data doctor
- master data schedule

Di phase ini, fokus pindah ke flow patient:

- lihat daftar klinik
- lihat daftar dokter
- hitung BMI
- buat booking
- dapat QR token unik
- lihat riwayat booking sendiri

---

## Step 2 — Tambah Validator Booking Patient

### File: `shared/validators/booking.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/shared/validators/booking.ts:1`

Isi file:

```ts
import { z } from 'zod'

export const bmiSchema = z.object({
  heightCm: z.number().positive(),
  weightKg: z.number().positive()
})

export const createBookingSchema = z.object({
  clinicId: z.string().min(1),
  doctorId: z.string().min(1),
  scheduleDate: z.string().min(1),
  scheduleTime: z.string().min(1),
  heightCm: z.number().positive(),
  weightKg: z.number().positive()
})
```

Tujuan:

- cegah input booking kotor masuk database

---

## Step 3 — Buat Utility BMI

### File: `server/utils/bmi.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/utils/bmi.ts:1`

Isi file:

```ts
export function calculateBmi(heightCm: number, weightKg: number) {
  const heightMeter = heightCm / 100
  const bmi = weightKg / (heightMeter * heightMeter)
  return Number(bmi.toFixed(2))
}

export function getBmiCategory(bmi: number) {
  if (bmi < 18.5) return 'underweight'
  if (bmi < 25) return 'normal'
  if (bmi < 30) return 'overweight'
  return 'obese'
}
```

Tujuan:

- logika BMI tidak ditulis berulang-ulang di endpoint

---

## Step 4 — Buat Utility QR Token

### File: `server/utils/qr-token.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/utils/qr-token.ts:1`

Isi file:

```ts
import { randomUUID } from 'node:crypto'

export function generateQrToken() {
  return randomUUID()
}
```

Tujuan:

- hasilkan token unik untuk booking
- staff nanti scan token ini saat check-in

---

## Step 5 — Endpoint Public List Clinics

### Endpoint

- `GET /api/clinics`

### File: `server/api/clinics/index.get.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/api/clinics/index.get.ts:1`

Isi file:

```ts
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'

export default defineEventHandler(async () => {
  const clinics = await db.clinic.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  })

  return ok(clinics)
})
```

Tujuan:

- patient bisa lihat daftar klinik aktif

---

## Step 6 — Endpoint Public List Doctors

### Endpoint

- `GET /api/doctors?clinicId=&date=&serviceId=`

### File: `server/api/doctors/index.get.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/api/doctors/index.get.ts:1`

Isi file:

```ts
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const clinicId = query.clinicId as string | undefined
  const serviceId = query.serviceId as string | undefined

  const doctors = await db.doctor.findMany({
    where: {
      isActive: true,
      ...(clinicId ? { clinicId } : {}),
      ...(serviceId ? { serviceId } : {})
    },
    include: {
      clinic: true,
      service: true,
      schedules: true
    },
    orderBy: { fullName: 'asc' }
  })

  return ok(doctors)
})
```

Catatan:

- filter `date` bisa ditambah nanti kalau schedule sudah mau dibatasi lebih ketat

---

## Step 7 — Endpoint BMI

### Endpoint

- `POST /api/bookings/calculate-bmi`

### File: `server/api/bookings/calculate-bmi.post.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/api/bookings/calculate-bmi.post.ts:1`

Isi file:

```ts
import { bmiSchema } from '~~/shared/validators/booking'
import { ok } from '~~/server/utils/api-response'
import { calculateBmi, getBmiCategory } from '~~/server/utils/bmi'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = bmiSchema.parse(body)

  const bmi = calculateBmi(data.heightCm, data.weightKg)
  const category = getBmiCategory(bmi)

  return ok({
    bmi,
    category
  })
})
```

---

## Step 8 — Endpoint Create Booking

### Endpoint

- `POST /api/bookings`

### File: `server/api/bookings/index.post.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/api/bookings/index.post.ts:1`

Isi contoh awal:

```ts
import { createError } from 'h3'
import { db } from '~~/server/database'
import { auth } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/api-response'
import { calculateBmi } from '~~/server/utils/bmi'
import { generateQrToken } from '~~/server/utils/qr-token'
import { createBookingSchema } from '~~/shared/validators/booking'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.headers
  })

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const patient = await db.patient.findFirst({
    where: { userId: session.user.id }
  })

  if (!patient) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Patient profile not found'
    })
  }

  const body = await readBody(event)
  const data = createBookingSchema.parse(body)

  const bmiResult = calculateBmi(data.heightCm, data.weightKg)
  const qrToken = generateQrToken()

  const booking = await db.booking.create({
    data: {
      patientId: patient.id,
      clinicId: data.clinicId,
      doctorId: data.doctorId,
      scheduleDate: new Date(data.scheduleDate),
      scheduleTime: data.scheduleTime,
      heightCm: data.heightCm,
      weightKg: data.weightKg,
      bmiResult,
      qrToken,
      status: 'booked'
    }
  })

  return ok(booking)
})
```

Saat create booking, backend harus:

- validasi session user
- ambil profile patient
- hitung BMI
- generate QR token unik
- simpan booking ke DB

---

## Step 9 — Endpoint Riwayat Booking Patient

### Endpoint minimum

- `GET /api/bookings/me`
- `GET /api/bookings/:bookingId`

### File 1: `server/api/bookings/me.get.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/api/bookings/me.get.ts:1`

Isi file:

```ts
import { createError } from 'h3'
import { db } from '~~/server/database'
import { auth } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/api-response'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.headers
  })

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const patient = await db.patient.findFirst({
    where: { userId: session.user.id }
  })

  if (!patient) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Patient profile not found'
    })
  }

  const bookings = await db.booking.findMany({
    where: { patientId: patient.id },
    include: {
      doctor: true
    },
    orderBy: { createdAt: 'desc' }
  })

  return ok(bookings)
})
```

### File 2: `server/api/bookings/[bookingId].get.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/api/bookings/[bookingId].get.ts:1`

Isi file:

```ts
import { createError } from 'h3'
import { db } from '~~/server/database'
import { auth } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/api-response'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.headers
  })

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const patient = await db.patient.findFirst({
    where: { userId: session.user.id }
  })

  if (!patient) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Patient profile not found'
    })
  }

  const bookingId = getRouterParam(event, 'bookingId')

  const booking = await db.booking.findFirst({
    where: {
      id: bookingId,
      patientId: patient.id
    },
    include: {
      doctor: true
    }
  })

  if (!booking) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Booking not found'
    })
  }

  return ok(booking)
})
```

Tujuan:

- patient hanya bisa lihat booking miliknya sendiri

---

## Step 10 — Test End-to-End

### Jalankan server

```bash
pnpm dev
```

### Test BMI

```bash
curl -X POST http://localhost:3000/api/bookings/calculate-bmi \
  -H "Content-Type: application/json" \
  -d '{
    "heightCm": 170,
    "weightKg": 65
  }'
```

### Test create booking

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "clinicId": "CLINIC_ID_HERE",
    "doctorId": "DOCTOR_ID_HERE",
    "scheduleDate": "2026-08-25",
    "scheduleTime": "09:00",
    "heightCm": 170,
    "weightKg": 65
  }'
```

### Test checklist

1. patient login
2. ambil list clinic
3. ambil list doctor
4. hitung BMI
5. create booking
6. cek booking di database
7. cek `qrToken` unik
8. cek `GET /api/bookings/me`
9. cek `GET /api/bookings/:bookingId`

---

## Hasil Phase 3

Kalau phase ini selesai, project sudah punya:

- public endpoint clinic
- public endpoint doctor
- endpoint BMI
- endpoint create booking
- endpoint riwayat booking patient
- QR token unik per booking

Patient sudah bisa booking. Staff siap masuk Phase 4.

## Next Phase

Kalau Phase 3 selesai, lanjut ke:

- `/Users/fachridjohar/project_tumbuhub/sehatku/docs/phase-4-staff-checkin-and-queue.md:1`
