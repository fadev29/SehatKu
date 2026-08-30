<script setup lang="ts">
const highlights = [
  {
    icon: 'i-lucide-calendar-check-2',
    title: 'Booking online',
    description: 'Pilih jadwal kunjungan tanpa perlu antre langsung di klinik.'
  },
  {
    icon: 'i-lucide-activity',
    title: 'Antrean realtime',
    description: 'Pantau nomor panggilan dan estimasi layanan secara langsung.'
  },
  {
    icon: 'i-lucide-file-heart',
    title: 'Riwayat medis',
    description: 'Simpan riwayat kunjungan dan data dasar pasien dalam satu akun.'
  },
  {
    icon: 'i-lucide-map-pinned',
    title: 'Klinik terdekat',
    description: 'Temukan lokasi klinik dan layanan yang paling sesuai dengan kebutuhan.'
  }
];

const steps = [
  {
    number: '01',
    title: 'Daftar atau masuk',
    description: 'Pasien membuat akun, lalu masuk untuk mulai booking layanan.'
  },
  {
    number: '02',
    title: 'Pilih jadwal kunjungan',
    description: 'Tentukan klinik, dokter, dan waktu kunjungan yang tersedia.'
  },
  {
    number: '03',
    title: 'Datang dan check-in cepat',
    description: 'Tunjukkan booking atau QR untuk masuk antrean tanpa proses panjang.'
  }
];

const testimonials = [
  {
    name: 'Aulia Rahma',
    role: 'Pasien Umum',
    quote: 'Booking jadi jauh lebih mudah. Saya bisa pilih jadwal tanpa perlu datang lebih awal.'
  },
  {
    name: 'Dimas Prakoso',
    role: 'Pasien Keluarga',
    quote: 'Antrean realtime membantu. Saya tahu kapan harus bersiap tanpa menunggu terlalu lama.'
  },
  {
    name: 'Nadia Putri',
    role: 'Pengguna Baru',
    quote: 'Tampilannya rapi dan mudah dipahami. Proses daftar sampai booking terasa singkat.'
  }
];
</script>

<template>
  <div class="space-y-16 pb-12">
    <section class="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary/10 via-white to-white px-6 py-12 shadow-sm sm:px-10 lg:px-14 lg:py-16">
      <div class="absolute inset-0 z-0 opacity-10">
        <svg class="h-full w-full" fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <pattern id="a" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#0D9488" /></pattern>
          <rect width="100%" height="100%" fill="url(#a)" />
        </svg>
      </div>
      <div class="relative z-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div class="space-y-6">
          <UBadge color="primary" variant="subtle" size="lg">Booking klinik tanpa antre panjang</UBadge>
          <div class="space-y-4">
            <h1 class="max-w-3xl text-4xl font-bold tracking-tight text-highlighted sm:text-5xl lg:text-6xl">
              Layanan kesehatan lebih tenang, cepat, dan mudah bersama `Sehatku`
            </h1>
            <p class="max-w-2xl text-lg leading-8 text-muted">
              Booking online, antrean realtime, riwayat medis, dan akses klinik terdekat dalam satu pengalaman yang rapi dan profesional.
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <UButton label="Mulai Booking" to="/register" size="xl" color="primary" trailing-icon="i-lucide-arrow-right" />
            <UButton label="Masuk" to="/login" size="xl" color="neutral" variant="subtle" icon="i-lucide-log-in" />
          </div>

          <div class="grid gap-4 pt-2 sm:grid-cols-3">
            <div class="rounded-2xl border border-primary/10 bg-white/90 p-4 shadow-sm">
              <p class="text-2xl font-semibold text-primary">4 layanan inti</p>
              <p class="mt-1 text-sm text-muted">booking, antrean, riwayat, dan lokasi klinik</p>
            </div>
            <div class="rounded-2xl border border-primary/10 bg-white/90 p-4 shadow-sm">
              <p class="text-2xl font-semibold text-primary">Realtime</p>
              <p class="mt-1 text-sm text-muted">status antrean selalu terlihat jelas</p>
            </div>
            <div class="rounded-2xl border border-primary/10 bg-white/90 p-4 shadow-sm">
              <p class="text-2xl font-semibold text-primary">Akses mudah</p>
              <p class="mt-1 text-sm text-muted">dibuat untuk alur pasien yang sederhana</p>
            </div>
          </div>
        </div>

        <div class="relative flex items-center justify-center rounded-[2rem] border border-primary/10 bg-white p-6 shadow-xl shadow-primary/10">
          <div class="relative h-[400px] w-full max-w-sm rounded-[2rem] border-8 border-slate-700 bg-slate-900 shadow-xl">
            <div class="absolute inset-0 rounded-[1.7rem] overflow-hidden">
              <img src="https://picsum.photos/400/800?grayscale&blur=2" alt="App Preview" class="h-full w-full object-cover" />
              <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
              <div class="absolute bottom-0 left-0 right-0 p-4 text-white">
                <p class="text-lg font-bold">Antrean Anda</p>
                <p class="text-4xl font-bold">B-045</p>
                <p class="text-sm opacity-80">Poli Gigi • Drg. Sita • 14:00</p>
                <div class="mt-3 flex items-center justify-between text-sm">
                  <span>Estimasi</span>
                  <span>10 Menit</span>
                </div>
              </div>
            </div>
            <div class="absolute -bottom-2 -right-2 h-16 w-16 rounded-full bg-primary flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg">
              <UIcon name="i-lucide-check" class="size-8" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="space-y-6">
      <div class="max-w-2xl space-y-2">
        <h2 class="text-3xl font-semibold tracking-tight text-highlighted">Fitur unggulan</h2>
        <p class="text-lg text-muted">Fokus pada kebutuhan inti pasien sejak booking sampai antrean layanan.</p>
      </div>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <UPageCard v-for="item in highlights" :key="item.title" class="rounded-2xl border border-default shadow-sm">
          <div class="space-y-4">
            <div class="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UIcon :name="item.icon" class="size-6" />
            </div>
            <div>
              <h3 class="text-xl font-semibold text-highlighted">{{ item.title }}</h3>
              <p class="mt-2 text-sm leading-6 text-muted">{{ item.description }}</p>
            </div>
          </div>
        </UPageCard>
      </div>
    </section>

    <section class="space-y-6 rounded-[2rem] border border-default bg-default p-6 shadow-sm sm:p-8">
      <div class="max-w-2xl space-y-2">
        <h2 class="text-3xl font-semibold tracking-tight text-highlighted">Cara kerja</h2>
        <p class="text-lg text-muted">Tiga langkah sederhana untuk mulai menggunakan layanan Sehatku.</p>
      </div>
      <div class="grid gap-4 lg:grid-cols-3">
        <UPageCard v-for="step in steps" :key="step.number" class="rounded-2xl border border-default shadow-sm">
          <div class="space-y-4">
            <div class="flex size-12 items-center justify-center rounded-full bg-primary text-base font-semibold text-white">
              {{ step.number }}
            </div>
            <div>
              <h3 class="text-xl font-semibold text-highlighted">{{ step.title }}</h3>
              <p class="mt-2 text-sm leading-6 text-muted">{{ step.description }}</p>
            </div>
          </div>
        </UPageCard>
      </div>
    </section>

    <section class="space-y-6">
      <div class="max-w-2xl space-y-2">
        <h2 class="text-3xl font-semibold tracking-tight text-highlighted">Apa kata pasien</h2>
        <p class="text-lg text-muted">Testimoni dummy untuk memberi gambaran kepercayaan pengguna baru.</p>
      </div>
      <div class="grid gap-4 lg:grid-cols-3">
        <UPageCard v-for="item in testimonials" :key="item.name" class="rounded-2xl border border-default shadow-sm">
          <div class="space-y-5">
            <div class="flex items-center gap-3">
              <div class="flex size-12 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                {{ item.name.split(' ').map(part => part[0]).join('').slice(0, 2) }}
              </div>
              <div>
                <p class="font-semibold text-highlighted">{{ item.name }}</p>
                <p class="text-sm text-muted">{{ item.role }}</p>
              </div>
            </div>
            <p class="text-sm leading-7 text-muted">“{{ item.quote }}”</p>
          </div>
        </UPageCard>
      </div>
    </section>
  </div>
</template>
