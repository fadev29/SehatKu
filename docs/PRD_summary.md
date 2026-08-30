# Ringkasan PRD Sehatku v0.3

PRD `Sehatku v0.3` tanggal `22 Agustus 2026` mendefinisikan Sehatku sebagai sistem web manajemen klinik untuk booking pasien, QR check-in, antrean dokter realtime, monitor ruang tunggu, dan pencetakan tiket thermal dari smartphone Android memakai Web Bluetooth dan ESC/POS.

## Masalah yang Ingin Diselesaikan

- antrean manual menumpuk di klinik
- check-in lambat
- transparansi urutan layanan rendah
- tenaga medis dan staff sulit memantau kehadiran pasien secara akurat

## Solusi Produk

- patient booking online
- patient dapat QR code unik
- staff scan QR untuk check-in
- sistem menerbitkan nomor antrean
- staff print tiket thermal langsung dari Chrome Android
- doctor mengelola status pelayanan realtime
- monitor menampilkan panggilan aktif dan video edukasi saat idle
- admin mengelola master data dan laporan harian

## Role

- `Guest / User Umum`
- `Patient`
- `Staff / Petugas`
- `Doctor`
- `Monitor`
- `Admin`

## Scope MVP

- landing page responsif
- register, login, logout, RBAC
- booking online dengan input antropometri dan BMI otomatis
- QR code unik untuk booking
- staff check-in via scan QR atau pencarian manual
- nomor antrean dan print tiket thermal
- panel doctor dengan aksi `Panggil`, `Skip`, `Selesai`
- monitor antrean realtime + video YouTube saat idle
- admin CRUD master data, booking, antrean, video, printer profile, laporan harian

## Komponen Teknis Kunci

- frontend `Nuxt`
- `Web Bluetooth API`
- BLE GATT writable characteristic
- generator `ESC/POS`
- printer profile configurable
- embed `YouTube` untuk mode idle monitor

## Batasan MVP

- workflow print fokus Android Chromium atau Chrome
- produksi wajib `HTTPS`
- development boleh `localhost`
- tidak memakai `window.print()`
- tidak memakai `QZ Tray`
- tidak memakai driver printer desktop
- tidak memakai native Android wrapper pada MVP

## Profil Printer Referensi

- model referensi `RPP02N-43E4`
- service UUID `0000ff00-0000-1000-8000-00805f9b34fb`
- characteristic UUID `0000ff02-0000-1000-8000-00805f9b34fb`

## Acceptance Penting

- staff bisa sambungkan printer dari Chrome Android
- status UI harus jelas saat printer terhubung atau putus
- satu klik print menghasilkan satu tiket fisik yang terbaca
- tiket memuat data inti antrean
- reprint tidak membuat nomor antrean baru
- perubahan UUID printer tidak mengubah alur booking atau check-in

## Hal yang Masih TBD

- nama brand resmi klinik
- printer final produksi dan jumlah unit per lokasi
- spek minimum smartphone Android staff
- hosting atau server produksi
- daftar video YouTube awal
- retensi log `print_job`
