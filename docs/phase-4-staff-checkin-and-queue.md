# Phase 4 — Staff Check-in dan Queue

## Overview Flow

1. Buat validator scan QR dan manual search
2. Buat helper role guard `staff`
3. Buat endpoint scan QR booking
4. Buat endpoint manual search fallback
5. Buat helper nomor antrean
6. Buat endpoint create queue
7. Pastikan idempotency
8. Test retry tanpa duplikasi queue

---

## Step 1 — Tujuan Phase 4

Setelah `Phase 3` selesai, patient sudah bisa:

- booking
- hitung BMI
- dapat `qrToken`

Di phase ini, fokus pindah ke operasional staff:

- scan QR patient
- validasi booking
- fallback manual search
- buat `check_in`
- buat `queue`
- cegah duplikasi queue saat retry

---

## Step 2 — Buat Guard Staff

### File: `server/utils/require-staff.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/utils/require-staff.ts:1`

Isi file:

```ts
import { createError } from 'h3'
import { auth } from '~~/server/utils/auth'

export async function requireStaff(event: Parameters<typeof auth.api.getSession>[0]) {
  const session = await auth.api.getSession({
    headers: event.headers
  })

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  if (session.user.role !== 'staff' && session.user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    })
  }

  return session
}
```

Tujuan:

- hanya `staff` atau `admin` boleh akses flow check-in

---

## Step 3 — Buat Validator Staff

### File: `shared/validators/staff.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/shared/validators/staff.ts:1`

Isi file:

```ts
import { z } from 'zod'

export const scanQrSchema = z.object({
  qrToken: z.string().min(1)
})

export const manualSearchSchema = z.object({
  keyword: z.string().min(1)
})

export const createQueueSchema = z.object({
  bookingId: z.string().min(1),
  checkInMethod: z.enum(['qr', 'manual']).default('qr')
})
```

Tujuan:

- validasi input staff sebelum query database

---

## Step 4 — Endpoint Scan QR Booking

### Endpoint

- `POST /api/staff/check-ins/scan`

### File: `server/api/staff/check-ins/scan.post.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/api/staff/check-ins/scan.post.ts:1`

Isi file:

```ts
import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireStaff } from '~~/server/utils/require-staff'
import { scanQrSchema } from '~~/shared/validators/staff'

export default defineEventHandler(async (event) => {
  await requireStaff(event)

  const body = await readBody(event)
  const data = scanQrSchema.parse(body)

  const booking = await db.booking.findFirst({
    where: {
      qrToken: data.qrToken,
      status: 'booked'
    },
    include: {
      patient: true,
      doctor: true,
      checkIn: true
    }
  })

  if (!booking) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Booking not found or invalid'
    })
  }

  return ok({
    bookingId: booking.id,
    patientName: booking.patient.fullName,
    doctorName: booking.doctor.fullName,
    scheduleDate: booking.scheduleDate,
    scheduleTime: booking.scheduleTime,
    bmiResult: booking.bmiResult,
    alreadyCheckedIn: Boolean(booking.checkIn)
  })
})
```

Tujuan:

- scan QR tidak langsung bikin queue
- scan QR hanya validasi dulu dan tampilkan preview data

---

## Step 5 — Endpoint Manual Search

### Endpoint

- `POST /api/staff/check-ins/manual-search`

### File: `server/api/staff/check-ins/manual-search.post.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/api/staff/check-ins/manual-search.post.ts:1`

Isi file:

```ts
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireStaff } from '~~/server/utils/require-staff'
import { manualSearchSchema } from '~~/shared/validators/staff'

export default defineEventHandler(async (event) => {
  await requireStaff(event)

  const body = await readBody(event)
  const data = manualSearchSchema.parse(body)

  const bookings = await db.booking.findMany({
    where: {
      status: 'booked',
      OR: [
        {
          patient: {
            fullName: {
              contains: data.keyword,
              mode: 'insensitive'
            }
          }
        },
        {
          patient: {
            phone: {
              contains: data.keyword
            }
          }
        }
      ]
    },
    include: {
      patient: true,
      doctor: true,
      checkIn: true
    },
    take: 10,
    orderBy: { createdAt: 'desc' }
  })

  return ok(bookings)
})
```

Tujuan:

- fallback jika QR gagal dibaca

---

## Step 6 — Buat Helper Nomor Antrean

### File: `server/utils/queue-number.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/utils/queue-number.ts:1`

Isi file:

```ts
export function formatQueueNumber(sequence: number) {
  return `A-${String(sequence).padStart(2, '0')}`
}
```

Catatan:

- untuk phase ini pakai format sederhana dulu
- rule final bisa diubah nanti jadi per clinic, per service, atau per doctor

---

## Step 7 — Endpoint Create Queue

### Endpoint

- `POST /api/staff/queues`

### File: `server/api/staff/queues/index.post.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/api/staff/queues/index.post.ts:1`

Isi file:

```ts
import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireStaff } from '~~/server/utils/require-staff'
import { createQueueSchema } from '~~/shared/validators/staff'
import { formatQueueNumber } from '~~/server/utils/queue-number'

export default defineEventHandler(async (event) => {
  const session = await requireStaff(event)

  const body = await readBody(event)
  const data = createQueueSchema.parse(body)

  const booking = await db.booking.findFirst({
    where: {
      id: data.bookingId,
      status: 'booked'
    },
    include: {
      checkIn: {
        include: {
          queue: true
        }
      }
    }
  })

  if (!booking) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Booking not found or already processed'
    })
  }

  if (booking.checkIn?.queue) {
    return ok({
      queue: booking.checkIn.queue,
      reused: true
    })
  }

  const queue = await db.$transaction(async (tx) => {
    const existingCheckIn = await tx.checkIn.findUnique({
      where: { bookingId: booking.id },
      include: { queue: true }
    })

    if (existingCheckIn?.queue) {
      return existingCheckIn.queue
    }

    const checkIn = existingCheckIn ?? await tx.checkIn.create({
      data: {
        bookingId: booking.id,
        staffUserId: session.user.id,
        checkInMethod: data.checkInMethod
      }
    })

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
+
+    const todayEnd = new Date()
+    todayEnd.setHours(23, 59, 59, 999)
+
+    const totalQueueToday = await tx.queue.count({
+      where: {
+        createdAt: {
+          gte: todayStart,
+          lte: todayEnd
+        }
+      }
+    })
+
+    const queueNumber = formatQueueNumber(totalQueueToday + 1)
+
+    const createdQueue = await tx.queue.create({
+      data: {
+        checkInId: checkIn.id,
+        doctorId: booking.doctorId,
+        queueNumber,
+        status: 'waiting'
+      }
+    })
+
+    await tx.booking.update({
+      where: { id: booking.id },
+      data: { status: 'checked_in' }
+    })
+
+    return createdQueue
+  })
+
+  return ok({
+    queue,
+    reused: false
+  })
+})
+```
+
+Tujuan endpoint ini:
+
+- buat `check_in` jika belum ada
+- buat `queue` jika belum ada
+- update status booking jadi `checked_in`
+- kalau diulang, balikan queue lama, bukan bikin baru
+
+---
+
+## Step 8 — Kenapa Idempotency Penting
+
+Di flow staff, tombol bisa tertekan dua kali atau jaringan bisa retry otomatis.
+
+Kalau idempotency tidak dijaga:
+
+- satu patient bisa dapat dua nomor antrean
+- data print bisa kacau
+- doctor lihat antrean ganda
+
+Makanya di endpoint `POST /api/staff/queues`:
+
+- cek `checkIn.queue` dulu
+- pakai transaction
+- balikan queue lama kalau sudah pernah dibuat
+
+---
+
+## Step 9 — Test End-to-End
+
+### Jalankan server
+
+```bash
+pnpm dev
+```
+
+### Test scan QR
+
+```bash
+curl -X POST http://localhost:3000/api/staff/check-ins/scan \
+  -H "Content-Type: application/json" \
+  -d '{
+    "qrToken": "QR_TOKEN_HERE"
+  }'
+```
+
+### Test manual search
+
+```bash
+curl -X POST http://localhost:3000/api/staff/check-ins/manual-search \
+  -H "Content-Type: application/json" \
+  -d '{
+    "keyword": "Patient"
+  }'
+```
+
+### Test create queue
+
+```bash
+curl -X POST http://localhost:3000/api/staff/queues \
+  -H "Content-Type: application/json" \
+  -d '{
+    "bookingId": "BOOKING_ID_HERE",
+    "checkInMethod": "qr"
+  }'
+```
+
+### Checklist test
+
+1. patient sudah punya booking valid
+2. staff scan QR
+3. preview booking muncul
+4. create queue sukses
+5. `check_in` tercatat di DB
+6. `queue` tercatat di DB
+7. status booking jadi `checked_in`
+8. retry endpoint `POST /api/staff/queues`
+9. pastikan queue lama dipakai ulang
+
+---
+
+## Hasil Phase 4
+
+Kalau phase ini selesai, project sudah punya:
+
+- validasi QR booking
+- fallback manual search
+- record `check_in`
+- record `queue`
+- proteksi endpoint staff
+- idempotency queue creation
+
+Staff sudah bisa check-in patient. Project siap masuk Phase 5.
+
+## Next Phase
+
+Kalau Phase 4 selesai, lanjut ke:
+
+- `/Users/fachridjohar/project_tumbuhub/sehatku/docs/phase-5-print-doctor-monitor.md:1`
+EOF