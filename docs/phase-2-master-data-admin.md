# Phase 2 — Master Data Admin

## Overview Flow

1. Buat validator input CRUD
2. Buat helper auth admin
3. Buat API admin untuk clinic, service, doctor, schedule
4. Buat API admin untuk printer profile dan monitor videos
5. Tambah proteksi role `admin`
6. Test CRUD pakai seed data

---

## Step 1 — Tujuan Phase 2

Setelah `Phase 1` selesai, backend sudah punya:

- auth
- database
- Prisma client
- akun admin awal

Di phase ini, fokus kerja pindah ke **master data**. Data ini harus jadi dulu sebelum booking patient dan check-in staff dibangun.

Master data yang dibuat:

- `Clinic`
- `Service`
- `Doctor`
- `Schedule`
- `PrinterProfile`
- `MonitorAd`

---

## Step 2 — Buat Helper Response API

### File: `server/utils/api-response.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/utils/api-response.ts:1`

Isi file:

```ts
export function ok<T>(data: T) {
  return {
    success: true,
    data
  }
}

export function fail(message: string, errors?: unknown) {
  return {
    success: false,
    message,
    errors
  }
}
```

Fungsi:

- samakan bentuk response sukses
- samakan bentuk response error

---

## Step 3 — Buat Helper Guard Admin

### File: `server/utils/require-admin.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/utils/require-admin.ts:1`

Isi contoh awal:

```ts
import { createError } from 'h3'
import { auth } from '~~/server/utils/auth'

export async function requireAdmin(event: Parameters<typeof auth.api.getSession>[0]) {
  const session = await auth.api.getSession({
    headers: event.headers
  })

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  if (session.user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    })
  }

  return session
}
```

Tujuan:

- semua endpoint admin pakai guard yang sama

---

## Step 4 — Buat Validator Zod

### File: `shared/validators/admin.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/shared/validators/admin.ts:1`

Isi contoh awal:

```ts
import { z } from 'zod'

export const clinicSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  isActive: z.boolean().optional()
})

export const serviceSchema = z.object({
  clinicId: z.string().min(1),
  name: z.string().min(1),
  isActive: z.boolean().optional()
})

export const doctorSchema = z.object({
  fullName: z.string().min(1),
  specialization: z.string().optional(),
  clinicId: z.string().min(1),
  serviceId: z.string().min(1),
  isActive: z.boolean().optional()
})

export const scheduleSchema = z.object({
  doctorId: z.string().min(1),
  scheduleDate: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  quota: z.number().int().positive(),
  isActive: z.boolean().optional()
})

export const printerProfileSchema = z.object({
  name: z.string().min(1),
  serviceUuid: z.string().min(1),
  characteristicUuid: z.string().min(1),
  writeMode: z.string().optional(),
  isActive: z.boolean().optional()
})

export const monitorAdSchema = z.object({
  title: z.string().min(1),
  youtubeUrl: z.string().url(),
  isActive: z.boolean().optional()
})
```

Tujuan:

- semua payload admin tervalidasi sebelum masuk database

---

## Step 5 — CRUD Clinics

### Endpoint minimum

- `GET /api/admin/clinics`
- `POST /api/admin/clinics`
- `PATCH /api/admin/clinics/:clinicId`

### File 1: `server/api/admin/clinics/index.get.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/api/admin/clinics/index.get.ts:1`

Isi file:

```ts
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const clinics = await db.clinic.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return ok(clinics)
})
```

### File 2: `server/api/admin/clinics/index.post.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/api/admin/clinics/index.post.ts:1`

Isi file:

```ts
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'
import { clinicSchema } from '~~/shared/validators/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const data = clinicSchema.parse(body)

  const clinic = await db.clinic.create({
    data: {
      name: data.name,
      address: data.address,
      isActive: data.isActive ?? true
    }
  })

  return ok(clinic)
})
```

### File 3: `server/api/admin/clinics/[clinicId].patch.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/api/admin/clinics/[clinicId].patch.ts:1`

Isi file:

```ts
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'
import { clinicSchema } from '~~/shared/validators/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const clinicId = getRouterParam(event, 'clinicId')
  const body = await readBody(event)
  const data = clinicSchema.partial().parse(body)

  const clinic = await db.clinic.update({
    where: { id: clinicId },
    data
  })

  return ok(clinic)
})
```

---

## Step 6 — CRUD Services

### Endpoint minimum

- `GET /api/admin/services`
- `POST /api/admin/services`
- `PATCH /api/admin/services/:serviceId`

### Contoh file create: `server/api/admin/services/index.post.ts`

```ts
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'
import { serviceSchema } from '~~/shared/validators/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const data = serviceSchema.parse(body)

  const service = await db.service.create({
    data: {
      clinicId: data.clinicId,
      name: data.name,
      isActive: data.isActive ?? true
    }
  })

  return ok(service)
})
```

### File lain yang perlu dibuat

- `server/api/admin/services/index.get.ts`
- `server/api/admin/services/[serviceId].patch.ts`

---

## Step 7 — CRUD Doctors

### Endpoint minimum

- `GET /api/admin/doctors`
- `POST /api/admin/doctors`
- `PATCH /api/admin/doctors/:doctorId`

### Contoh file create: `server/api/admin/doctors/index.post.ts`

```ts
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'
import { doctorSchema } from '~~/shared/validators/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const data = doctorSchema.parse(body)

  const doctor = await db.doctor.create({
    data: {
      fullName: data.fullName,
      specialization: data.specialization,
      clinicId: data.clinicId,
      serviceId: data.serviceId,
      isActive: data.isActive ?? true
    }
  })

  return ok(doctor)
})
```

### File lain yang perlu dibuat

- `server/api/admin/doctors/index.get.ts`
- `server/api/admin/doctors/[doctorId].patch.ts`

---

## Step 8 — CRUD Schedules

### Endpoint minimum

- `GET /api/admin/schedules`
- `POST /api/admin/schedules`
- `PATCH /api/admin/schedules/:scheduleId`

### Contoh file create: `server/api/admin/schedules/index.post.ts`

```ts
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'
import { scheduleSchema } from '~~/shared/validators/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const data = scheduleSchema.parse(body)

  const schedule = await db.schedule.create({
    data: {
      doctorId: data.doctorId,
      scheduleDate: new Date(data.scheduleDate),
      startTime: data.startTime,
      endTime: data.endTime,
      quota: data.quota,
      isActive: data.isActive ?? true
    }
  })

  return ok(schedule)
})
```

---

## Step 9 — CRUD Printer Profiles

### Endpoint minimum

- `GET /api/admin/printer-profiles`
- `POST /api/admin/printer-profiles`
- `PATCH /api/admin/printer-profiles/:printerProfileId`

### Contoh file create: `server/api/admin/printer-profiles/index.post.ts`

```ts
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'
import { printerProfileSchema } from '~~/shared/validators/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const data = printerProfileSchema.parse(body)

  const profile = await db.printerProfile.create({
    data: {
      name: data.name,
      serviceUuid: data.serviceUuid,
      characteristicUuid: data.characteristicUuid,
      writeMode: data.writeMode,
      isActive: data.isActive ?? true
    }
  })

  return ok(profile)
})
```

---

## Step 10 — CRUD Monitor Videos

### Endpoint minimum

- `GET /api/admin/monitor-videos`
- `POST /api/admin/monitor-videos`
- `PATCH /api/admin/monitor-videos/:videoId`

### Contoh file create: `server/api/admin/monitor-videos/index.post.ts`

```ts
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'
import { monitorAdSchema } from '~~/shared/validators/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const data = monitorAdSchema.parse(body)

  const monitorAd = await db.monitorAd.create({
    data: {
      title: data.title,
      youtubeUrl: data.youtubeUrl,
      isActive: data.isActive ?? true
    }
  })

  return ok(monitorAd)
})
```

---

## Step 11 — Test Manual

### Jalankan server

```bash
pnpm dev
```

### Test create clinic

```bash
curl -X POST http://localhost:3000/api/admin/clinics \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Klinik Sehatku Pusat",
    "address": "Jl. Contoh No. 1",
    "isActive": true
  }'
```

### Test checklist

- admin login sukses
- semua endpoint admin tertolak untuk non-admin
- create/update data muncul di `pgAdmin`
- relasi clinic-service-doctor-schedule valid
- printer profile tersimpan rapi
- video monitor tersimpan rapi

---

## Hasil Phase 2

Kalau phase ini selesai, project sudah punya:

- master data klinik
- master data layanan
- master data dokter
- master data jadwal
- master data printer BLE
- master data video monitor

Project siap masuk Phase 3.

## Next Phase

Kalau Phase 2 selesai, lanjut ke:

- `/Users/fachridjohar/project_tumbuhub/sehatku/docs/phase-3-booking-patient.md:1`
