# Desain Sehatku

Dokumen ini merangkum desain final kerja repo `Sehatku` per `30 Agustus 2026`.

Sumber dipisah jelas:

- `PRD_Sehatku_v0.3_WebBluetooth_ESCPOS.pdf` = referensi kebutuhan produk
- repo `/Users/fachridjohar/antriku` = sumber kebenaran implementasi saat ini

## 1. Ringkasan Sistem

`Sehatku` adalah sistem klinik berbasis web dengan 5 role utama:

- `patient`
- `staff`
- `doctor`
- `monitor`
- `admin`

Alur inti:

1. pasien booking dari web
2. sistem membuat QR code booking
3. staff scan QR dengan kamera browser
4. sistem check-in dan membuat nomor antrean
5. staff print tiket via `Web Bluetooth` ke printer thermal
6. doctor memanggil antrean
7. monitor menampilkan panggilan realtime
8. admin mengelola data dan pengaturan

## 2. Prinsip Implementasi

- Satu aplikasi `Nuxt 4` untuk semua role
- Auth dan role dipegang server
- `Prisma + PostgreSQL` jadi source of truth data
- Print BLE tetap di browser staff
- Monitor pakai polling ringan + state API yang sederhana
- Dummy data tetap disiapkan supaya UI mudah lanjut ke API final

## 3. Arsitektur Tingkat Tinggi

```text
Patient / Staff / Doctor / Admin / Monitor
                  |
                  v
             Nuxt 4 App
      pages + layouts + server/api
                  |
                  v
           Prisma Client + PG
                  |
                  v
              PostgreSQL

Staff Android Browser
      |
      v
navigator.bluetooth
      |
      v
BLE GATT + ESC/POS
      |
      v
Thermal Printer
```

## 4. Role dan Tanggung Jawab

### Patient

- register dan login
- isi profil
- buat booking
- lihat QR code booking
- lihat riwayat dan detail booking

### Staff

- scan QR dengan kamera browser
- cari booking manual
- check-in dan check-in ulang
- print, reprint, tes print
- lihat antrean hari ini

### Doctor

- login per akun dokter
- lihat jadwal hari ini milik sendiri
- lihat antrean hari ini milik sendiri
- aksi `Panggil`, `Skip`, `Selesai`

### Monitor

- tampilkan antrean aktif
- tampilkan video edukasi
- tampilkan ticker bawah
- putar suara panggilan sesuai pengaturan

### Admin

- dashboard ringkas
- CRUD klinik, layanan, dokter, jadwal
- CRUD staff, pasien
- CRUD booking, antrean
- CRUD printer profile, video monitor
- laporan dan export
- pengaturan monitor/ticker/suara

## 5. Alur Kerja Sistem

### 5.1 Booking pasien

1. pasien login
2. pasien lengkapi profil dasar
3. pasien pilih klinik
4. pasien pilih dokter atau poli
5. pasien pilih tanggal dan jam dari jadwal aktif
6. pasien isi tinggi dan berat
7. sistem hitung BMI
8. sistem simpan `Booking` dengan `qrToken`
9. sistem hasilkan QR code lokal untuk scan staff

### 5.2 Check-in staff

1. staff buka panel staff
2. staff scan QR atau cari booking manual
3. server cek booking valid dan belum diproses
4. server buat `CheckIn`
5. server buat `Queue`
6. staff bisa lanjut auto-print atau print manual
7. server simpan `PrintJob` saat cetak dilakukan

### 5.3 Pemanggilan doctor

1. doctor buka panel doctor
2. doctor lihat antrean miliknya hari itu
3. doctor tekan `Panggil`
4. status queue berubah ke `called`
5. monitor menampilkan nomor aktif
6. tone diputar 1x lalu TTS nomor diputar berulang sesuai setting
7. doctor bisa `Skip` atau `Selesai`

### 5.4 Monitor ruang tunggu

1. monitor ambil `current`, `config`, `ticker`, dan video aktif
2. saat ada nomor dipanggil, video pause selama audio panggilan aktif
3. setelah audio selesai, video lanjut lagi
4. ticker bawah tetap bergerak dari kanan ke kiri

### 5.5 Admin operasional

1. admin kelola master data
2. admin kelola user operasional
3. admin cek booking dan antrean
4. admin ubah pengaturan ticker dan jumlah suara
5. admin export data untuk audit cepat

## 6. Model Data Inti

| Model | Fungsi |
|---|---|
| `User` | akun, role, avatar |
| `Patient` | profil pasien |
| `Clinic` | master klinik |
| `Service` | poli/layanan |
| `Doctor` | data dokter, relasi akun login |
| `Schedule` | jadwal dokter dan kuota |
| `Booking` | reservasi pasien |
| `CheckIn` | bukti kedatangan frontdesk |
| `Queue` | nomor antrean dan status layanan |
| `PrinterProfile` | profil printer BLE |
| `PrintJob` | log print dan reprint |
| `MonitorAd` | video edukasi monitor |

## 7. Endpoint Final Saat Ini

## Auth

- `ALL /api/auth/[...all]`

## Public

- `GET /api/clinics`
- `GET /api/doctors`
- `GET /api/services`
- `GET /api/schedules`

## Patient

- `GET /api/patient/me`
- `POST /api/patient/me`
- `PATCH /api/patient/me`
- `POST /api/patient/me/profile-image`
- `DELETE /api/patient/me/profile-image`
- `POST /api/bookings`
- `GET /api/bookings/me`
- `GET /api/bookings/[bookingId]`
- `PATCH /api/bookings/[bookingId]/cancel`
- `GET /api/bookings/[bookingId]/qr`
- `GET /api/bookings/[bookingId]/qr-code`
- `POST /api/bookings/calculate-bmi`

## Staff

- `GET /api/staff/bookings/today`
- `POST /api/staff/check-ins/scan`
- `POST /api/staff/check-ins/manual-search`
- `GET /api/staff/check-ins/today`
- `POST /api/staff/queues`
- `GET /api/staff/queues/today`
- `GET /api/staff/printer-profiles`
- `POST /api/staff/print-jobs`
- `POST /api/staff/print-jobs/reprint`
- `POST /api/staff/print-jobs/[printJobId]/reprint`

## Doctor

- `GET /api/doctor/queues/today`
- `GET /api/doctor/schedule/today`
- `POST /api/doctor/queues/[queueId]/call`
- `POST /api/doctor/queues/[queueId]/skip`
- `POST /api/doctor/queues/[queueId]/finish`
- `PATCH /api/doctor/queues/[queueId]/status`

## Monitor

- `GET /api/monitor/current`
- `GET /api/monitor/config`
- `GET /api/monitor/ticker`
- `GET /api/monitor/videos`

## Admin

- `GET /api/admin/dashboard`
- `GET/POST /api/admin/clinics`
- `PATCH/DELETE /api/admin/clinics/[clinicId]`
- `GET/POST /api/admin/services`
- `PATCH/DELETE /api/admin/services/[serviceId]`
- `GET/POST /api/admin/doctors`
- `PATCH/DELETE /api/admin/doctors/[doctorId]`
- `GET/POST /api/admin/schedules`
- `PATCH/DELETE /api/admin/schedules/[scheduleId]`
- `GET/POST /api/admin/staff`
- `PATCH/DELETE /api/admin/staff/[staffId]`
- `GET/POST /api/admin/patients`
- `GET /api/admin/patients/[patientId]`
- `PATCH/DELETE /api/admin/patients/[patientId]`
- `GET /api/admin/bookings`
- `GET /api/admin/bookings/[bookingId]`
- `PATCH/DELETE /api/admin/bookings/[bookingId]`
- `GET /api/admin/queues`
- `PATCH/DELETE /api/admin/queues/[queueId]`
- `POST /api/admin/queues/reset`
- `GET /api/admin/print-jobs`
- `GET/POST /api/admin/printer-profiles`
- `PATCH/DELETE /api/admin/printer-profiles/[printerProfileId]`
- `GET/POST /api/admin/monitor-videos`
- `PATCH/DELETE /api/admin/monitor-videos/[videoId]`
- `GET /api/admin/reports/summary`
- `GET /api/admin/reports/trends`
- `GET /api/admin/reports/daily`
- `GET /api/admin/reports/export`
- `GET /api/admin/settings`
- `POST /api/admin/settings`
- `PATCH /api/admin/settings/[key]`

## Utility

- `POST /api/upload/image`

## 8. Catatan Penting Implementasi

- `doctor/queues/today` dan `doctor/schedule/today` sudah berbasis `userId` akun dokter login.
- `Patient` sekarang dibatasi ketat untuk role `patient` saja.
- Cleanup data salah role disediakan lewat script `pnpm db:cleanup:patients`.
- Avatar user dipakai lintas panel lewat `User.image`.
- QR booking sudah siap untuk alur scan kamera staff.

## 9. Cleanup Data Salah Role

Kasus yang dibetulkan:

- user `admin`, `staff`, `doctor`, atau `monitor` sempat punya record `Patient`
- akibatnya data mereka muncul di menu admin pasien

Perbaikan:

- query admin pasien sekarang filter `user.role = patient`
- helper profil pasien menolak role selain `patient`
- script cleanup tersedia untuk hapus data lama salah role

Perintah:

```bash
pnpm db:cleanup:patients
```

## 10. Lanjutan Prioritas

- ganti store settings in-memory ke tabel database permanen
- tambah SSE atau WebSocket untuk monitor tanpa refresh/poll fallback
- tambah upload gambar untuk master data klinik/dokter/video bila dibutuhkan
- tambah audit log admin lebih lengkap
- tambah test route penting: booking, check-in, doctor call, monitor config
