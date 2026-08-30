# Phase 1 — Setup Backend, Prisma, PostgreSQL Lokal, dan Auth

## Overview Flow

1. Install tools (`Node.js`, `pnpm`, `PostgreSQL`, `pgAdmin`)
2. Buat database lokal `sehatku_dev`
3. Setup `.env`
4. Install dependencies backend (`prisma`, `@prisma/client`, `better-auth`, `zod`, `dotenv`, `tsx`)
5. Setup Prisma (`prisma/schema.prisma`)
6. Buat schema inti awal
7. Jalankan migration ke PostgreSQL lokal
8. Setup Prisma client di server
9. Setup Better Auth
10. Buat handler `/api/auth/*`
11. Seed admin awal
12. Test register/login/logout/session

---

## Step 1 — Install Tools

### Cek tools yang harus ada

```bash
node -v
pnpm -v
psql --version
```

Yang harus sudah ada:

- `Node.js 22`
- `pnpm`
- `PostgreSQL` lokal
- `pgAdmin`

Kalau belum ada `pnpm`:

```bash
npm install -g pnpm
```

---

## Step 2 — Buat Database Lokal di pgAdmin

### Langkah

1. Buka `pgAdmin`
2. Login ke PostgreSQL lokal
3. `Databases` → `Create` → `Database`
4. Nama database: `sehatku_dev`

### Catat nilai ini

- host: `localhost`
- port: `5432`
- database: `sehatku_dev`
- username PostgreSQL
- password PostgreSQL

---

## Step 3 — Setup `.env`

### File: `.env`

Lokasi file:

- `/Users/fachridjohar/project_tumbuhub/sehatku/.env:1`

Isi contoh:

```env
DATABASE_URL="postgresql://postgres:password_kamu@localhost:5432/sehatku_dev?schema=public"
BETTER_AUTH_SECRET="ganti_dengan_secret_random"
BETTER_AUTH_URL="http://localhost:3000"
ADMIN_EMAIL="admin@sehatku.local"
ADMIN_PASSWORD="password123"
GOOGLE_STITCH_API_KEY="ganti_dengan_key_baru_hasil_rotasi"
```

### Generate secret

```bash
openssl rand -base64 32
```

### Cek `.gitignore`

Pastikan ada:

```gitignore
.env
```

### Penjelasan variable

| Variable | Kegunaan |
| --- | --- |
| `DATABASE_URL` | koneksi Prisma ke PostgreSQL lokal |
| `BETTER_AUTH_SECRET` | secret session auth |
| `BETTER_AUTH_URL` | base URL auth |
| `ADMIN_EMAIL` | akun admin seed awal |
| `ADMIN_PASSWORD` | password admin seed awal |
| `GOOGLE_STITCH_API_KEY` | integrasi eksternal bila nanti dipakai |

---

## Step 4 — Install Dependencies Backend

```bash
pnpm install
pnpm add better-auth zod dotenv @prisma/client
pnpm add -D prisma tsx
```

### Fungsi package

- `better-auth` → auth engine
- `zod` → validasi input API
- `dotenv` → baca env untuk script standalone
- `@prisma/client` → query database
- `prisma` → schema, migration, generate client
- `tsx` → jalanin script TypeScript

---

## Step 5 — Setup Prisma

### Inisialisasi

```bash
pnpm exec prisma init
```

### File utama

- `/Users/fachridjohar/project_tumbuhub/sehatku/prisma/schema.prisma:1`

### Isi awal `schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Generate client

```bash
pnpm exec prisma generate
```

---

## Step 6 — Buat Schema Database Inti

### Tujuan

Bikin model inti dulu supaya auth dan flow bisnis punya pondasi data.

### File: `prisma/schema.prisma`

Tambahkan contoh schema awal ini di bawah `generator` dan `datasource`:

```prisma
enum UserRole {
  patient
  staff
  doctor
  admin
  monitor
}

enum BookingStatus {
  booked
  checked_in
  cancelled
  expired
}

enum QueueStatus {
  waiting
  called
  skipped
  completed
}

enum PrintJobType {
  print
  reprint
}

enum PrintJobStatus {
  pending
  success
  failed
}

model User {
  id           String   @id @default(cuid())
  name         String?
  email        String   @unique
  passwordHash String?
  role         UserRole @default(patient)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  patient      Patient?
}

model Patient {
  id         String    @id @default(cuid())
  userId     String    @unique
  fullName   String
  phone      String
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  bookings   Booking[]
}

model Clinic {
  id         String    @id @default(cuid())
  name       String
  address    String?
  isActive   Boolean   @default(true)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  services   Service[]
  doctors    Doctor[]
}

model Service {
  id         String    @id @default(cuid())
  clinicId   String
  name       String
  isActive   Boolean   @default(true)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  clinic     Clinic    @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  doctors    Doctor[]
}

model Doctor {
  id             String      @id @default(cuid())
  fullName       String
  specialization String?
  clinicId       String
  serviceId      String
  isActive       Boolean     @default(true)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  clinic         Clinic      @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  service        Service     @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  schedules      Schedule[]
  bookings       Booking[]
  queues         Queue[]
}

model Schedule {
  id            String    @id @default(cuid())
  doctorId      String
  scheduleDate  DateTime
  startTime     String
  endTime       String
  quota         Int
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  doctor        Doctor    @relation(fields: [doctorId], references: [id], onDelete: Cascade)
}

model Booking {
  id            String         @id @default(cuid())
  patientId     String
  clinicId      String
  doctorId      String
  scheduleDate  DateTime
  scheduleTime  String
  heightCm      Float
  weightKg      Float
  bmiResult     Float
  qrToken       String         @unique
  status        BookingStatus  @default(booked)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  patient       Patient        @relation(fields: [patientId], references: [id], onDelete: Cascade)
  doctor        Doctor         @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  checkIn       CheckIn?
}

model CheckIn {
  id             String    @id @default(cuid())
  bookingId      String    @unique
  staffUserId    String?
  checkInMethod  String
  checkedInAt    DateTime  @default(now())

  booking        Booking   @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  queue          Queue?
}

model Queue {
  id            String       @id @default(cuid())
  checkInId     String       @unique
  doctorId      String
  queueNumber   String
  status        QueueStatus  @default(waiting)
  calledAt      DateTime?
  completedAt   DateTime?
  skippedAt     DateTime?
  createdAt     DateTime     @default(now())

  checkIn       CheckIn      @relation(fields: [checkInId], references: [id], onDelete: Cascade)
  doctor        Doctor       @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  printJobs     PrintJob[]
}

model PrinterProfile {
  id                  String      @id @default(cuid())
  name                String
  serviceUuid         String
  characteristicUuid  String
  writeMode           String?
  isActive            Boolean     @default(true)
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt

  printJobs           PrintJob[]
}

model PrintJob {
  id                String          @id @default(cuid())
  queueId           String
  printerProfileId  String
  type              PrintJobType
  status            PrintJobStatus  @default(pending)
  printedAt         DateTime?
  errorMessage      String?
  createdAt         DateTime        @default(now())

  queue             Queue           @relation(fields: [queueId], references: [id], onDelete: Cascade)
  printerProfile    PrinterProfile  @relation(fields: [printerProfileId], references: [id], onDelete: Cascade)
}

model MonitorAd {
  id          String    @id @default(cuid())
  title       String
  youtubeUrl  String
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

### Catatan

- schema ini belum final 100%, tapi cukup kuat untuk Phase 1
- fokus phase ini pondasi auth dan data inti

---

## Step 7 — Jalankan Migration

```bash
pnpm exec prisma migrate dev --name init
pnpm exec prisma generate
pnpm exec prisma studio
```

### Cek hasil di `pgAdmin`

1. refresh database `sehatku_dev`
2. buka `Schemas > public > Tables`
3. pastikan tabel muncul

---

## Step 8 — Setup Prisma Client

### File: `server/database/index.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/database/index.ts:1`

Isi file:

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
```

Fungsi:

- export satu instance Prisma client reusable
- mencegah client dobel saat hot reload di dev

---

## Step 9 — Setup Better Auth

### File 1: `server/utils/auth.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/utils/auth.ts:1`

Isi awal contoh:

```ts
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { db } from '~~/server/database'

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql'
  }),
  emailAndPassword: {
    enabled: true
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'patient',
        input: false
      }
    }
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'],
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL
})
```

### File 2: `server/api/auth/[...all].ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/api/auth/[...all].ts:1`

Isi file:

```ts
import { auth } from '~~/server/utils/auth'

export default defineEventHandler((event) => {
  return auth.handler(toWebRequest(event))
})
```

### Role minimum

- `patient`
- `staff`
- `doctor`
- `admin`
- `monitor`

### Endpoint yang harus hidup dulu

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

---

## Step 10 — Tambahkan Script Kerja

### Update `package.json`

Tambahkan script ini:

```json
{
  "scripts": {
    "build": "nuxt build",
    "dev": "nuxt dev",
    "preview": "nuxt preview",
    "postinstall": "nuxt prepare",
    "lint": "eslint .",
    "typecheck": "nuxt typecheck",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx server/database/seeds/index.ts"
  }
}
```

---

## Step 11 — Seed Admin Awal

### File: `server/database/seeds/index.ts`

Lokasi:

- `/Users/fachridjohar/project_tumbuhub/sehatku/server/database/seeds/index.ts:1`

Isi contoh awal:

```ts
import 'dotenv/config'
import { db } from '~~/server/database'
import { hash } from 'better-auth/crypto'

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL atau ADMIN_PASSWORD belum di-set')
  }

  const passwordHash = await hash(password)

  await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Admin Sehatku',
      passwordHash,
      role: 'admin'
    }
  })

  console.log('Seed admin selesai')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
```

### Jalankan seed

```bash
pnpm db:seed
```

---

## Step 12 — Test Endpoint Auth

### Jalankan server

```bash
pnpm dev
```

### Test register

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Patient Test",
    "email": "patient1@sehatku.local",
    "password": "password123"
  }'
```

### Test login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient1@sehatku.local",
    "password": "password123"
  }'
```

### Yang dicek

- user masuk database
- session terbentuk
- role default `patient`
- admin seed bisa login
- response error jelas kalau payload salah

---

## Hasil Phase 1

Kalau phase ini selesai, project sudah punya:

- PostgreSQL lokal
- Prisma schema dan migration
- Better Auth aktif
- akun admin awal
- fondasi backend siap untuk Phase 2

## Next Phase

Kalau Phase 1 selesai, lanjut ke:

- `/Users/fachridjohar/project_tumbuhub/sehatku/docs/phase-2-master-data-admin.md:1`
