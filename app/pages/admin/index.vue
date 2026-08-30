<script setup lang="ts">
definePageMeta({ role: 'admin', layout: 'admin' })

const { data: dashboardData, pending, error, refresh } = await useFetch('/api/admin/dashboard')
const { data: queuesData } = await useFetch('/api/admin/queues')
const { data: bookingsData } = await useFetch('/api/admin/bookings')

const dashboard = computed(() => dashboardData.value?.data ?? {
  bookings: 0,
  checkedIn: 0,
  queues: { waiting: 0, called: 0, completed: 0 },
  clinics: 0,
  doctors: 0,
  schedules: 0,
  patients: 0
})

const stats = computed(() => [
  { label: 'Total Booking', value: String(dashboard.value.bookings), icon: 'i-lucide-ticket-check' },
  { label: 'Check-in', value: String(dashboard.value.checkedIn), icon: 'i-lucide-user-check' },
  { label: 'Menunggu', value: String(dashboard.value.queues.waiting), icon: 'i-lucide-calendar-clock' },
  { label: 'Selesai', value: String(dashboard.value.queues.completed), icon: 'i-lucide-badge-check' }
])

const queuePerPoli = computed(() => {
  const map = new Map<string, { poli: string, total: number }>()
  const rows = queuesData.value?.data ?? []

  for (const row of rows) {
    const poli = row.doctor?.clinic?.name || 'Tanpa Klinik'
    const current = map.get(poli) ?? { poli, total: 0 }
    current.total += 1
    map.set(poli, current)
  }

  return [...map.values()].slice(0, 4)
})

const activities = computed(() => {
  const rows = bookingsData.value?.data ?? []
  return rows.slice(0, 5).map((row: any) => ({
    name: row.patient?.fullName || 'Pasien',
    action: `${row.status} - ${row.doctor?.clinic?.name || 'Klinik'}`,
    time: `${new Date(row.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
    icon: row.status === 'checked_in' ? 'i-lucide-user-check' : row.status === 'cancelled' ? 'i-lucide-circle-x' : 'i-lucide-calendar-plus'
  }))
})
</script>

<template>
  <div class="admin-page">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold">Overview</h1>
        <p class="mt-1 text-sm text-muted">Ringkasan aktivitas operasional dari backend admin.</p>
      </div>
      <UButton label="Muat Ulang" icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="pending" @click="refresh" />
    </div>

    <UPageCard v-if="error" class="admin-table-card border border-error/30">
      <p class="font-semibold text-error">Gagal memuat dashboard.</p>
      <p class="mt-1 text-sm text-muted">Cek session admin atau endpoint dashboard.</p>
    </UPageCard>

    <div class="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
      <UPageCard v-for="item in stats" :key="item.label">
        <div class="space-y-4">
          <div class="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UIcon :name="item.icon" class="size-6" />
          </div>
          <div>
            <p class="text-base text-muted">{{ item.label }}</p>
            <p class="mt-2 text-5xl font-semibold">{{ item.value }}</p>
          </div>
        </div>
      </UPageCard>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1.2fr_minmax(0,0.8fr)]">
      <UPageCard class="admin-table-card">
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-2xl font-semibold">Antrean per Klinik</h2>
            </div>
            <div class="text-sm text-muted">{{ queuePerPoli.length }} grup</div>
          </div>
        </template>

        <div v-if="queuePerPoli.length" class="grid h-[22rem] gap-4 content-end grid-cols-4 items-end">
          <div v-for="item in queuePerPoli" :key="item.poli" class="space-y-3 text-center">
            <div class="mx-auto flex w-full max-w-24 items-end justify-center rounded-t-xl bg-primary/15 text-primary font-semibold" :style="{ height: `${Math.max(item.total * 16, 36)}px` }">
              <span class="pb-2">{{ item.total }}</span>
            </div>
            <p class="text-sm text-muted">{{ item.poli }}</p>
          </div>
        </div>
        <div v-else class="py-16 text-center text-muted">Belum ada data antrean.</div>
      </UPageCard>

      <UPageCard class="admin-table-card">
        <template #header>
          <div>
            <h2 class="text-2xl font-semibold">Aktivitas Terkini</h2>
          </div>
        </template>

        <div v-if="activities.length" class="space-y-5">
          <div v-for="item in activities" :key="`${item.name}-${item.time}`" class="flex items-start gap-3">
            <div class="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UIcon :name="item.icon" class="size-5" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-semibold">{{ item.name }}</p>
                  <p class="text-sm text-muted">{{ item.action }}</p>
                </div>
                <span class="shrink-0 text-sm text-muted">{{ item.time }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="py-16 text-center text-muted">Belum ada aktivitas.</div>
      </UPageCard>
    </div>
  </div>
</template>
