# Phase 5 — Print Job, Doctor Queue, dan Monitor

## Overview Flow

1. Buat validator print job dan update status queue
2. Buat helper guard `doctor`
3. Buat endpoint create `print_job`
4. Buat endpoint reprint
5. Buat endpoint list `print_jobs` untuk admin
6. Buat endpoint queue harian doctor
7. Buat endpoint update status queue
8. Buat endpoint monitor current + videos
9. Siapkan kontrak event realtime minimum
10. Test alur end-to-end

---

## Step 1 — Tujuan Phase 5

Setelah `Phase 4` selesai, staff sudah bisa:

- validasi booking
- buat `check_in`
- buat `queue`

Di phase ini, fokus pindah ke tiga area:

- audit print dan reprint
- workflow doctor
- payload monitor realtime

---

## Step 2 — Buat Validator Phase 5

### File: `shared/validators/queue.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/shared/validators/queue.ts:1`

Isi file:

```ts
import { z } from 'zod'

export const createPrintJobSchema = z.object({
  queueId: z.string().min(1),
  printerProfileId: z.string().min(1),
  type: z.enum(['print', 'reprint']).default('print'),
  status: z.enum(['pending', 'success', 'failed']).default('success'),
  errorMessage: z.string().optional()
})

export const updateQueueStatusSchema = z.object({
  status: z.enum(['waiting', 'called', 'skipped', 'completed'])
})
```

Tujuan:

- validasi payload print job
- validasi payload update status queue

---

## Step 3 — Buat Guard Doctor

### File: `server/utils/require-doctor.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/utils/require-doctor.ts:1`

Isi file:

```ts
import { createError } from 'h3'
import { auth } from '~~/server/utils/auth'

export async function requireDoctor(event: Parameters<typeof auth.api.getSession>[0]) {
  const session = await auth.api.getSession({
    headers: event.headers
  })

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  if (session.user.role !== 'doctor' && session.user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    })
  }

  return session
}
```

Tujuan:

- hanya doctor atau admin boleh akses queue doctor

---

## Step 4 — Endpoint Create Print Job

### Endpoint

- `POST /api/staff/print-jobs`

### File: `server/api/staff/print-jobs/index.post.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/api/staff/print-jobs/index.post.ts:1`

Isi file:

```ts
import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireStaff } from '~~/server/utils/require-staff'
import { createPrintJobSchema } from '~~/shared/validators/queue'

export default defineEventHandler(async (event) => {
  await requireStaff(event)

  const body = await readBody(event)
  const data = createPrintJobSchema.parse(body)

  const queue = await db.queue.findUnique({
    where: { id: data.queueId }
  })

  if (!queue) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Queue not found'
    })
  }

  const printerProfile = await db.printerProfile.findUnique({
    where: { id: data.printerProfileId }
  })

  if (!printerProfile) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Printer profile not found'
    })
  }

  const printJob = await db.printJob.create({
    data: {
      queueId: data.queueId,
      printerProfileId: data.printerProfileId,
      type: data.type,
      status: data.status,
      errorMessage: data.errorMessage,
      printedAt: data.status === 'success' ? new Date() : null
    }
  })

  return ok(printJob)
})
```

Tujuan:

- semua print dan gagal print tercatat di backend

---

## Step 5 — Endpoint Reprint

### Endpoint

- `POST /api/staff/print-jobs/:printJobId/reprint`

### File: `server/api/staff/print-jobs/[printJobId]/reprint.post.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/api/staff/print-jobs/[printJobId]/reprint.post.ts:1`

Isi file:

```ts
import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireStaff } from '~~/server/utils/require-staff'

export default defineEventHandler(async (event) => {
  await requireStaff(event)

  const printJobId = getRouterParam(event, 'printJobId')

  const existing = await db.printJob.findUnique({
    where: { id: printJobId }
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Print job not found'
    })
  }

  const reprintJob = await db.printJob.create({
    data: {
      queueId: existing.queueId,
      printerProfileId: existing.printerProfileId,
      type: 'reprint',
      status: 'success',
      printedAt: new Date()
    }
  })

  return ok(reprintJob)
})
```

Aturan penting:

- reprint bikin `print_job` baru
- reprint tidak bikin `queue` baru

---

## Step 6 — Endpoint List Print Jobs untuk Admin

### Endpoint

- `GET /api/admin/print-jobs`

### File: `server/api/admin/print-jobs/index.get.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/api/admin/print-jobs/index.get.ts:1`

Isi file:

```ts
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const printJobs = await db.printJob.findMany({
    include: {
      queue: true,
      printerProfile: true
    },
    orderBy: { createdAt: 'desc' }
  })

  return ok(printJobs)
})
```

Tujuan:

- admin bisa audit semua history print

---

## Step 7 — Endpoint Queue Harian Doctor

### Endpoint

- `GET /api/doctor/queues/today`

### File: `server/api/doctor/queues/today.get.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/api/doctor/queues/today.get.ts:1`

Isi file:

```ts
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireDoctor } from '~~/server/utils/require-doctor'

export default defineEventHandler(async (event) => {
  const session = await requireDoctor(event)

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const queues = await db.queue.findMany({
    where: {
      createdAt: {
        gte: todayStart,
        lte: todayEnd
      },
      doctor: {
        fullName: session.user.name ?? undefined
      }
    },
    include: {
      checkIn: {
        include: {
          booking: {
            include: {
              patient: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  return ok(queues)
})
```

Catatan:

- untuk starter, mapping doctor ke session masih sederhana
- nanti lebih rapi kalau `doctor` punya `userId` langsung di schema

---

## Step 8 — Endpoint Update Status Queue

### Endpoint

- `PATCH /api/doctor/queues/:queueId/status`

### File: `server/api/doctor/queues/[queueId]/status.patch.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/api/doctor/queues/[queueId]/status.patch.ts:1`

Isi file:

```ts
import { createError } from 'h3'
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'
import { requireDoctor } from '~~/server/utils/require-doctor'
import { updateQueueStatusSchema } from '~~/shared/validators/queue'

export default defineEventHandler(async (event) => {
  await requireDoctor(event)

  const queueId = getRouterParam(event, 'queueId')
  const body = await readBody(event)
  const data = updateQueueStatusSchema.parse(body)

  const queue = await db.queue.findUnique({
    where: { id: queueId }
  })

  if (!queue) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Queue not found'
    })
  }

  const updateData: Record<string, unknown> = {
    status: data.status
  }

  if (data.status === 'called') updateData.calledAt = new Date()
  if (data.status === 'skipped') updateData.skippedAt = new Date()
  if (data.status === 'completed') updateData.completedAt = new Date()

  const updatedQueue = await db.queue.update({
    where: { id: queueId },
    data: updateData
  })

  return ok(updatedQueue)
})
```

Tujuan:

- doctor bisa panggil, skip, selesai

---

## Step 9 — Endpoint Monitor Current

### Endpoint

- `GET /api/monitor/current`

### File: `server/api/monitor/current.get.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/api/monitor/current.get.ts:1`

Isi file:

```ts
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'

export default defineEventHandler(async () => {
  const currentQueue = await db.queue.findFirst({
    where: {
      status: 'called'
    },
    include: {
      doctor: true
    },
    orderBy: { calledAt: 'desc' }
  })

  return ok(currentQueue)
})
```

Tujuan:

- monitor tahu antrean aktif yang sedang dipanggil

---

## Step 10 — Endpoint Monitor Videos

### Endpoint

- `GET /api/monitor/videos`

### File: `server/api/monitor/videos.get.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/api/monitor/videos.get.ts:1`

Isi file:

```ts
import { db } from '~~/server/database'
import { ok } from '~~/server/utils/api-response'

export default defineEventHandler(async () => {
  const videos = await db.monitorAd.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  })

  return ok(videos)
})
```

Tujuan:

- monitor tahu video apa yang diputar saat idle

---

## Step 11 — Kontrak Realtime Minimum

Belum perlu final transport dulu, tapi event minimum harus disepakati:

- `queue.called`
- `queue.updated`
- `queue.completed`
- `monitor.idle`
- `monitor.active`

Contoh payload event:

```json
{
  "event": "queue.called",
  "data": {
    "queueId": "que_1",
    "queueNumber": "A-01",
    "doctorName": "Dr. A"
  }
}
```

Catatan:

- implementasi awal boleh polling dulu
- nanti bisa dinaikkan ke `SSE` atau `WebSocket`

---

## Step 12 — Test End-to-End

### Jalankan server

```bash
pnpm dev
```

### Test create print job

```bash
curl -X POST http://localhost:3000/api/staff/print-jobs \
  -H "Content-Type: application/json" \
  -d '{
    "queueId": "QUEUE_ID_HERE",
    "printerProfileId": "PRINTER_PROFILE_ID_HERE",
    "type": "print",
    "status": "success"
  }'
```

### Test reprint

```bash
curl -X POST http://localhost:3000/api/staff/print-jobs/PRINT_JOB_ID_HERE/reprint
```

### Test update queue status

```bash
curl -X PATCH http://localhost:3000/api/doctor/queues/QUEUE_ID_HERE/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "called"
  }'
```

### Checklist test

1. queue dibuat dari phase 4
2. print job tercatat
3. reprint bikin job baru
4. queue tidak dobel
5. doctor bisa ubah status queue
6. `GET /api/monitor/current` berubah sesuai status `called`
7. `GET /api/monitor/videos` balikin video aktif

---

## Hasil Phase 5

Kalau phase ini selesai, project sudah punya:

- audit `print_jobs`
- reprint flow
- queue doctor harian
- update status queue
- payload monitor aktif
- daftar video monitor idle
- kontrak realtime minimum

Project siap masuk Phase 6 frontend integrasi.

## Next Phase

Kalau Phase 5 selesai, lanjut ke:

- `/Users/fachridjohar/project_tumbuhub/sehatku/docs/phase-6-frontend-integration.md:1`
