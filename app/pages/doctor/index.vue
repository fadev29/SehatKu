<script setup lang="ts">
definePageMeta({ role: 'doctor', layout: 'doctors' })

type ScheduleRow = {
  id: string
  startTime: string
  endTime: string
  doctor?: { fullName?: string | null, clinic?: { name?: string | null } | null }
}

type QueueRow = {
  id: string
  queueNumber: string
  status: string
  calledAt?: string | null
  checkIn?: { booking?: { patient?: { fullName?: string | null } | null } | null } | null
  doctor?: { fullName?: string | null, clinic?: { name?: string | null } | null, service?: { name?: string | null } | null } | null
}

const toast = useToast()
const search = ref('')
const actionLoading = ref('')
const errorMessage = ref('')
const { data: scheduleData } = await useFetch('/api/doctor/schedule/today')
const { data: queueData, pending, refresh } = await useFetch('/api/doctor/queues/today', { refresh: 8000 })

const schedules = computed(() => (scheduleData.value?.data ?? []) as ScheduleRow[])
const rows = computed(() => (queueData.value?.data ?? []) as QueueRow[])
const calledRows = computed(() => rows.value.filter((row) => row.status === 'called'))
const activeQueue = computed(() => calledRows.value.sort((left, right) => new Date(right.calledAt || 0).getTime() - new Date(left.calledAt || 0).getTime())[0] ?? null)
const waitingRows = computed(() => rows.value.filter((row) => row.status === 'waiting'))
const nextQueue = computed(() => waitingRows.value[0] ?? null)
const filteredRows = computed(() => waitingRows.value.filter((row) => `${row.queueNumber} ${row.checkIn?.booking?.patient?.fullName ?? ''}`.toLowerCase().includes(search.value.toLowerCase())))
const doctorName = computed(() => schedules.value[0]?.doctor?.fullName || activeQueue.value?.doctor?.fullName || nextQueue.value?.doctor?.fullName || 'Dokter')
const clinicName = computed(() => schedules.value[0]?.doctor?.clinic?.name || activeQueue.value?.doctor?.clinic?.name || nextQueue.value?.doctor?.clinic?.name || 'Klinik')
const serviceName = computed(() => activeQueue.value?.doctor?.service?.name || nextQueue.value?.doctor?.service?.name || 'Poli Klinik')
const practiceHours = computed(() => schedules.value.map((item) => `${item.startTime} - ${item.endTime}`).join(', ') || '-')
const waitingCount = computed(() => waitingRows.value.length)

function getBadgeColor(status: string) {
  if (status === 'called') return 'success'
  if (status === 'waiting') return 'primary'
  if (status === 'completed') return 'success'
  if (status === 'skipped') return 'error'
  return 'warning'
}

function canCall(row?: QueueRow | null) {
  return row?.status === 'waiting'
}

function canResolve(row?: QueueRow | null) {
  return row?.status === 'called'
}

async function runAction(action: 'call' | 'skip' | 'finish', queueId?: string) {
  if (!queueId) return
  errorMessage.value = ''
  actionLoading.value = `${action}:${queueId}`
  try {
    const result = await $fetch(`/api/doctor/queues/${queueId}/${action}`, { method: 'POST' })
    toast.add({
      title: action === 'call' ? 'Pasien dipanggil' : action === 'skip' ? 'Antrean di-skip' : 'Antrean selesai',
      description: `Nomor ${result.data.queue.queueNumber} sudah diproses`,
      color: 'success'
    })
    await refresh()
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.message || 'Aksi antrean gagal'
    toast.add({ title: 'Aksi gagal', description: errorMessage.value, color: 'error' })
  } finally {
    actionLoading.value = ''
  }
}
</script>

<template>
  <div class="space-y-6">
    <div v-if="errorMessage" class="rounded-2xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{{ errorMessage }}</div>

    <UPageCard>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-start gap-4">
          <div class="rounded-xl bg-primary/10 p-3 text-primary"><UIcon name="i-lucide-stethoscope" class="size-7" /></div>
          <div>
            <h2 class="text-3xl font-semibold text-primary">{{ clinicName }} - {{ doctorName }}</h2>
            <p class="mt-1 text-sm text-muted">{{ serviceName }} • Jadwal Praktik: {{ practiceHours }}</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" :loading="pending" @click="refresh">Refresh</UButton>
        </div>
      </div>
    </UPageCard>

    <div class="grid gap-6 xl:grid-cols-[1fr_minmax(0,1.15fr)]">
      <div class="space-y-4">
        <UPageCard>
          <div class="mb-8 flex items-start justify-between gap-4"><div><p class="text-sm font-semibold uppercase tracking-wide text-muted">Sedang dipanggil</p></div><UBadge :color="activeQueue ? 'success' : 'neutral'" variant="subtle">{{ activeQueue ? 'Aktif' : 'Kosong' }}</UBadge></div>
          <div v-if="activeQueue" class="space-y-8 text-center">
            <div><p class="text-sm text-muted">Nomor Antrean</p><p class="mt-3 text-7xl font-bold tracking-tight text-primary">{{ activeQueue.queueNumber }}</p></div>
            <USeparator />
            <div><p class="text-sm text-muted">Nama Pasien</p><p class="mt-3 text-4xl font-semibold">{{ activeQueue.checkIn?.booking?.patient?.fullName || '-' }}</p></div>
          </div>
          <div v-else class="py-16 text-center text-muted">Belum ada antrean aktif.</div>
        </UPageCard>

        <UPageCard>
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-semibold uppercase tracking-wide text-muted">Berikutnya di monitor</p>
              <p class="mt-2 text-4xl font-bold tracking-tight text-slate-900">{{ nextQueue?.queueNumber || '-' }}</p>
              <p class="mt-2 text-sm text-muted">{{ nextQueue?.checkIn?.booking?.patient?.fullName || 'Belum ada antrean menunggu' }}</p>
            </div>
            <UBadge color="primary" variant="subtle">Menunggu: {{ waitingCount }}</UBadge>
          </div>
        </UPageCard>

        <UButton block size="xl" color="primary" icon="i-lucide-megaphone" class="justify-center" :disabled="!canCall(waitingRows[0])" :loading="actionLoading === `call:${waitingRows[0]?.id}`" @click="runAction('call', waitingRows[0]?.id)">Panggil Berikutnya</UButton>
        <div class="grid gap-3 sm:grid-cols-2">
          <UButton block color="error" variant="outline" icon="i-lucide-skip-forward" :disabled="!canResolve(activeQueue)" :loading="actionLoading === `skip:${activeQueue?.id}`" @click="runAction('skip', activeQueue?.id)">Skip</UButton>
          <UButton block color="success" variant="outline" icon="i-lucide-badge-check" :disabled="!canResolve(activeQueue)" :loading="actionLoading === `finish:${activeQueue?.id}`" @click="runAction('finish', activeQueue?.id)">Selesai</UButton>
        </div>
      </div>

      <UPageCard>
        <div class="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div><h3 class="text-2xl font-semibold">Daftar Antrean</h3><p class="mt-1 text-sm text-muted">Monitor akan baca antrean `called` dan `waiting` dari daftar ini</p></div>
          <UInput v-model="search" icon="i-lucide-search" placeholder="Cari nomor atau pasien..." class="md:max-w-xs" />
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="border-b border-default text-left text-muted"><tr><th class="px-4 py-3 font-medium">Nomor</th><th class="px-4 py-3 font-medium">Pasien</th><th class="px-4 py-3 font-medium">Status</th><th class="px-4 py-3 text-right font-medium">Aksi</th></tr></thead>
            <tbody>
              <tr v-if="!pending && filteredRows.length === 0" class="border-b border-default/60 last:border-b-0"><td colspan="4" class="px-4 py-8 text-center text-muted">Tidak ada antrean menunggu.</td></tr>
              <tr v-for="row in filteredRows" :key="row.id" class="border-b border-default/60 last:border-b-0"><td class="px-4 py-5"><div class="inline-flex rounded-xl bg-primary/10 px-4 py-2 text-lg font-semibold text-primary">{{ row.queueNumber }}</div></td><td class="px-4 py-5"><p class="font-semibold">{{ row.checkIn?.booking?.patient?.fullName || '-' }}</p></td><td class="px-4 py-5"><UBadge :color="getBadgeColor(row.status)" variant="subtle">{{ row.status }}</UBadge></td><td class="px-4 py-5"><div class="flex justify-end gap-2"><UButton icon="i-lucide-megaphone" color="primary" variant="ghost" :disabled="!canCall(row)" :loading="actionLoading === `call:${row.id}`" @click="runAction('call', row.id)" /><UButton icon="i-lucide-skip-forward" color="error" variant="ghost" :disabled="!canResolve(row)" :loading="actionLoading === `skip:${row.id}`" @click="runAction('skip', row.id)" /></div></td></tr>
            </tbody>
          </table>
        </div>
      </UPageCard>
    </div>
  </div>
</template>
