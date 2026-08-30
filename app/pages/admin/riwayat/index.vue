<script setup lang="ts">
definePageMeta({ role: 'admin', layout: 'admin' })

type TrendRow = { date: string, bookings: number, checkIns: number, queuesCompleted: number }
type DailyRow = {
  id: string
  status: string
  scheduleDate: string
  scheduleTime: string
  patient?: { fullName?: string | null, phone?: string | null }
  doctor?: { fullName?: string | null }
  checkIn?: { queue?: { queueNumber?: string | null, status?: string | null } | null } | null
}

const { data: summaryData, pending: summaryPending, refresh: refreshSummary } = await useFetch('/api/admin/reports/summary')
const { data: trendData, pending: trendPending, refresh: refreshTrend } = await useFetch('/api/admin/reports/trends')
const { data: dailyData, pending: dailyPending, refresh: refreshDaily } = await useFetch('/api/admin/reports/daily')

const summary = computed(() => summaryData.value?.data ?? {
  bookings: { booked: 0, checkedIn: 0, cancelled: 0, expired: 0 },
  queues: { waiting: 0, called: 0, skipped: 0, completed: 0 },
  prints: { success: 0, failed: 0 }
})
const trend = computed(() => (trendData.value?.data ?? []) as TrendRow[])
const rows = computed(() => (dailyData.value?.data ?? []) as DailyRow[])

const stats = computed(() => [
  { label: 'Total Booking', value: String(summary.value.bookings.booked), note: 'status booked', icon: 'i-lucide-calendar-check-2' },
  { label: 'Check-in', value: String(summary.value.bookings.checkedIn), note: 'booking tervalidasi', icon: 'i-lucide-user-check' },
  { label: 'Antrean Selesai', value: String(summary.value.queues.completed), note: 'layanan selesai', icon: 'i-lucide-badge-check' },
  { label: 'Print Sukses', value: String(summary.value.prints.success), note: `gagal ${summary.value.prints.failed}`, icon: 'i-lucide-printer' }
])

const distribution = computed(() => {
  const total = summary.value.bookings.booked + summary.value.bookings.checkedIn + summary.value.bookings.cancelled + summary.value.bookings.expired
  if (!total) return []

  return [
    { label: 'Booked', value: `${Math.round((summary.value.bookings.booked / total) * 100)}%` },
    { label: 'Checked-in', value: `${Math.round((summary.value.bookings.checkedIn / total) * 100)}%` },
    { label: 'Cancelled', value: `${Math.round((summary.value.bookings.cancelled / total) * 100)}%` },
    { label: 'Expired', value: `${Math.round((summary.value.bookings.expired / total) * 100)}%` }
  ]
})

const topDoctors = computed(() => {
  const map = new Map<string, { nama: string, poli: string, total: number, rating: string }>()

  for (const row of rows.value) {
    const nama = row.doctor?.fullName || 'Tanpa dokter'
    const current = map.get(nama) ?? { nama, poli: 'Kunjungan', total: 0, rating: '4.8' }
    current.total += 1
    map.set(nama, current)
  }

  return [...map.values()].sort((left, right) => right.total - left.total).slice(0, 5)
})

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID')
}

async function refreshAll() {
  await Promise.all([refreshSummary(), refreshTrend(), refreshDaily()])
}

function exportReport() {
  window.open('/api/admin/reports/export', '_blank')
}
</script>

<template>
  <div class="admin-page">
    <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h1 class="text-4xl font-semibold tracking-tight">Laporan & Analisis</h1>
        <p class="mt-2 text-lg text-muted">Ringkasan laporan sekarang memakai endpoint admin yang sudah discaffold.</p>
      </div>
      <div class="flex gap-3">
        <UButton label="Muat Ulang" icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="summaryPending || trendPending || dailyPending" @click="refreshAll" />
        <UButton label="Export CSV" icon="i-lucide-file-spreadsheet" color="primary" @click="exportReport" />
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <UPageCard v-for="item in stats" :key="item.label"><div class="flex items-start justify-between gap-4"><div><p class="text-sm text-muted">{{ item.label }}</p><p class="mt-2 text-5xl font-semibold">{{ item.value }}</p><p class="mt-3 text-sm text-muted">{{ item.note }}</p></div><div class="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><UIcon :name="item.icon" class="size-6" /></div></div></UPageCard>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1.6fr_minmax(0,0.9fr)]">
      <UPageCard class="admin-table-card">
        <div class="flex items-center justify-between gap-4"><h2 class="text-3xl font-semibold">Tren 7 Hari</h2><span class="text-sm text-muted">{{ trend.length }} titik</span></div>
        <div class="mt-8 flex h-80 items-end gap-3 overflow-hidden">
          <div v-for="point in trend" :key="point.date" class="flex flex-1 items-end justify-center">
            <div class="w-full rounded-t-[2rem] bg-primary/20" :style="{ height: `${Math.max(point.bookings * 12, 24)}px` }">
              <div class="px-2 pt-2 text-center text-xs text-primary">{{ point.bookings }}</div>
            </div>
          </div>
        </div>
      </UPageCard>

      <UPageCard class="admin-table-card">
        <h2 class="text-3xl font-semibold">Distribusi Booking</h2>
        <div class="mx-auto my-8 flex size-56 items-center justify-center rounded-full border-[24px] border-primary/20 text-center">
          <div><p class="text-5xl font-semibold">{{ summary.bookings.booked + summary.bookings.checkedIn + summary.bookings.cancelled + summary.bookings.expired }}</p><p class="text-muted">Total</p></div>
        </div>
        <div class="space-y-3">
          <div v-for="item in distribution" :key="item.label" class="flex items-center justify-between"><div class="flex items-center gap-2"><span class="size-3 rounded-full bg-primary" /><span>{{ item.label }}</span></div><span class="font-medium">{{ item.value }}</span></div>
        </div>
      </UPageCard>
    </div>

    <UPageCard class="admin-table-card">
      <div class="flex items-center justify-between gap-4"><h2 class="text-3xl font-semibold">Kunjungan Terbaru</h2><span class="text-sm text-muted">{{ rows.length }} baris</span></div>
      <div class="admin-mobile-table mt-6 overflow-x-auto">
        <table class="min-w-full text-sm"><thead class="bg-elevated/50 text-left text-muted"><tr><th class="px-6 py-4 font-medium">Pasien</th><th class="px-6 py-4 font-medium">Dokter</th><th class="px-6 py-4 font-medium">Tanggal</th><th class="px-6 py-4 font-medium">Antrean</th><th class="px-6 py-4 font-medium">Status</th></tr></thead><tbody><tr v-for="row in rows.slice(0, 10)" :key="row.id" class="border-t border-default/70"><td class="px-6 py-4" data-label="Pasien"><p class="font-semibold">{{ row.patient?.fullName || '-' }}</p><p class="text-xs text-muted">{{ row.patient?.phone || '-' }}</p></td><td class="px-6 py-4" data-label="Dokter">{{ row.doctor?.fullName || '-' }}</td><td class="px-6 py-4" data-label="Tanggal">{{ formatDate(row.scheduleDate) }} • {{ row.scheduleTime }}</td><td class="px-6 py-4" data-label="Antrean">{{ row.checkIn?.queue?.queueNumber || '-' }}</td><td class="px-6 py-4" data-label="Status"><UBadge color="primary" variant="subtle">{{ row.status }}</UBadge></td></tr></tbody></table>
      </div>
    </UPageCard>

    <UPageCard class="admin-table-card">
      <div class="flex items-center justify-between gap-4"><h2 class="text-3xl font-semibold">Top Dokter</h2><span class="text-sm text-muted">Olah dari data harian</span></div>
      <div class="admin-mobile-table mt-6 overflow-x-auto">
        <table class="min-w-full text-sm"><thead class="bg-elevated/50 text-left text-muted"><tr><th class="px-6 py-4 font-medium">Nama Dokter</th><th class="px-6 py-4 font-medium">Kategori</th><th class="px-6 py-4 font-medium">Total</th><th class="px-6 py-4 font-medium">Rating Dummy</th></tr></thead><tbody><tr v-for="row in topDoctors" :key="row.nama" class="border-t border-default/70"><td class="px-6 py-4 font-semibold" data-label="Dokter">{{ row.nama }}</td><td class="px-6 py-4" data-label="Kategori"><UBadge color="success" variant="subtle">{{ row.poli }}</UBadge></td><td class="px-6 py-4" data-label="Total">{{ row.total }}</td><td class="px-6 py-4 text-primary" data-label="Rating">{{ row.rating }}</td></tr></tbody></table>
      </div>
    </UPageCard>
  </div>
</template>

<style scoped>
@media (max-width: 767px) {
  .admin-mobile-table table thead { display:none; }
  .admin-mobile-table table, .admin-mobile-table tbody, .admin-mobile-table tr, .admin-mobile-table td { display:block; width:100%; }
  .admin-mobile-table tr { margin-bottom:1rem; overflow:hidden; border:1px solid rgb(226 232 240); border-radius:1rem; background:white; }
  .admin-mobile-table td { padding:.875rem 1rem; border-bottom:1px solid rgb(241 245 249); }
  .admin-mobile-table td:last-child { border-bottom:none; }
  .admin-mobile-table td::before { content: attr(data-label); display:block; margin-bottom:.35rem; font-size:.7rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:rgb(100 116 139); }
}
</style>
