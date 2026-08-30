# Sehatku

Sehatku adalah aplikasi booking, check-in, antrean, monitor ruang tunggu, dan cetak tiket thermal untuk klinik. Repo ini sudah berisi alur inti multi-role: `patient`, `staff`, `doctor`, `monitor`, dan `admin`.

PRD `PRD_Sehatku_v0.3_WebBluetooth_ESCPOS.pdf` dipakai sebagai referensi kebutuhan produk. Implementasi final tetap mengikuti kondisi codebase di repo ini.

## Fitur Aktif

- Auth `better-auth` dengan role `patient`, `staff`, `doctor`, `admin`, `monitor`
- Booking pasien dengan BMI otomatis, QR token, dan QR code lokal
- Profil pasien: ubah nama, telepon, avatar, sandi
- Staff: scan QR kamera browser, check-in, print, reprint, check-in ulang, tes print
- Doctor: antrean hari ini, aksi `Panggil`, `Skip`, `Selesai`
- Monitor: nomor antrean aktif, ticker dinamis, video edukasi, suara panggilan
- Admin: dashboard, CRUD master data, booking, antrean, laporan, pengaturan, monitor, printer
- Dummy API dan data seed untuk pengembangan UI lebih cepat

## Stack

- `Nuxt 4`
- `TypeScript`
- `@nuxt/ui`
- `Prisma ORM 7` + `@prisma/adapter-pg`
- `PostgreSQL`
- `better-auth`
- `vue-qrcode-reader`

## Menjalankan Proyek

## 1. Install

```bash
pnpm install
```

## 2. Siapkan environment

Isi minimal:

```env
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
ADMIN_EMAIL=admin@sehatku.local
ADMIN_PASSWORD=password123
DUMMY_USER_PASSWORD=password123
NUXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH=
NUXT_PUBLIC_CLOUDFLARE_IMAGES_DELIVERY_URL=
CLOUDFLARE_IMAGES_API_TOKEN=
```

## 3. Generate client dan seed

```bash
pnpm db:generate
pnpm db:seed
```

## 4. Jalankan app

```bash
pnpm dev
```

## 5. Validasi

```bash
pnpm lint
pnpm typecheck
```

## Akun Dummy

- `admin@sehatku.local`
- `staff@sehatku.local`
- `monitor@sehatku.local`
- `dokter.umum@sehatku.local`
- `dokter.gigi@sehatku.local`
- `dokter.anak@sehatku.local`
- `pasien1@sehatku.local`
- `pasien2@sehatku.local`
- `pasien3@sehatku.local`
- `pasien4@sehatku.local`

Password default non-admin: nilai `DUMMY_USER_PASSWORD`.

## Perintah Database

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:cleanup:patients
```

`pnpm db:cleanup:patients` menghapus record `Patient` yang salah role, misalnya milik `admin`, `staff`, `doctor`, atau `monitor`.

## Alur Kerja Sistem

## 1. Pasien

1. Register atau login.
2. Lengkapi profil dasar.
3. Buka halaman booking.
4. Pilih klinik, poli/dokter, tanggal, dan jam.
5. Isi tinggi dan berat.
6. Sistem hitung BMI.
7. Sistem simpan booking dan buat QR code.
8. Booking masuk ke halaman riwayat.

## 2. Staff

1. Buka panel staff.
2. Scan QR pasien dari kamera browser atau cari manual.
3. Sistem validasi booking hari itu.
4. Sistem buat data check-in dan nomor antrean.
5. Staff bisa print atau reprint tiket lewat Bluetooth printer.
6. Semua hasil print tercatat di log.

## 3. Doctor

1. Login dengan akun dokter masing-masing.
2. Panel hanya menampilkan antrean milik dokter login.
3. Dokter menekan `Panggil`, `Skip`, atau `Selesai`.
4. Status antrean berubah dan dikirim ke monitor.

## 4. Monitor

1. Monitor membaca antrean aktif dan konfigurasi suara.
2. Saat ada nomor baru dipanggil, monitor tampilkan nomor aktif.
3. Suara panggilan diputar sesuai setting admin.
4. Saat idle, video edukasi tetap berjalan.
5. Ticker bawah mengambil pesan dari settings admin.

## 5. Admin

1. Kelola master data klinik, layanan, dokter, jadwal, staff, pasien.
2. Kelola booking, antrean, printer profile, dan video monitor.
3. Lihat laporan harian, summary, tren, dan export.
4. Atur ticker monitor dan jumlah pengulangan suara.

## Thermal Print MVP

Arsitektur print di panel staff:

```text
Android Chrome / Nuxt
  -> Web Bluetooth API
  -> BLE GATT Service
  -> Writable Characteristic
  -> ESC/POS bytes
  -> Printer Thermal
```

Catatan:

- Print jalan dari browser staff, bukan server.
- Data tiket tidak dikirim ke layanan pihak ketiga.
- Cocok untuk printer BLE `ESC/POS` yang support write characteristic.

## Struktur Fitur Utama

- `/` landing page
- `/login` login
- `/register` register pasien
- `/profile` profil pasien
- `/booking` form booking pasien
- `/riwayat` riwayat booking pasien
- `/staff` panel frontdesk
- `/doctor` panel dokter
- `/monitor` panel layar tunggu
- `/admin/*` panel admin

## Catatan Implementasi

- Doctor sekarang memakai akun login sendiri dan query antrean/schedule berbasis `userId` dokter login.
- QR booking sudah berbentuk QR code lokal untuk scan kamera staff.
- Avatar profil pasien mendukung crop ringan, compress fallback, preview, dan hapus foto.
- Halaman admin sudah punya pola mobile card untuk layar kecil.

Lihat detail endpoint dan desain sistem di `/Users/fachridjohar/antriku/Desain.md:1`.
# SehatKu
