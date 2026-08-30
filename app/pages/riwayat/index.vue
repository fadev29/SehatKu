<script setup lang="ts">
import { getBookingQrCodeUrl } from '~~/app/utils/qr-code'

definePageMeta({ middleware: 'auth' })

type Booking = {
  id: string
  status: string
  scheduleDate: string
  scheduleTime: string
  qrToken?: string | null
  doctor?: { fullName?: string | null; specialty?: string | null } | null
}

type BookingQr = {
  id: string
  qrToken: string
  status: string
  scheduleDate: string
  scheduleTime: string
  doctor?: { fullName?: string | null } | null
}

type ApiList<T> = { data?: T[] }
type ApiItem<T> = { data?: T }

const toast = useToast()
const detailOpen = ref(false)
const selectedBookingId = ref('')
const cancellingId = ref('')
const actionError = ref('')

const { data, pending, refresh } = await useFetch<ApiList<Booking>>('/api/bookings/me')
const rows = computed(() => (data.value?.data ?? []) as Booking[])

const stats = computed(() => [
  { label: 'Riwayat kunjungan', value: String(rows.value.length), icon: 'i-lucide-history' },
  { label: 'Booking selesai', value: String(rows.value.filter((item) => item.status === 'finished').length), icon: 'i-lucide-badge-check' },
  { label: 'Dibatalkan', value: String(rows.value.filter((item) => item.status === 'cancelled').length), icon: 'i-lucide-ban' },
])

const { data: qrData, pending: qrPending, refresh: refreshQr } = await useFetch<ApiItem<BookingQr>>(
  () => selectedBookingId.value ? `/api/bookings/${selectedBookingId.value}/qr` : '/api/bookings/placeholder/qr',
  { immediate: false },
)

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function getStatusColor(status: string) {
  if (status === 'checked_in' || status === 'finished') return 'success'
  if (status === 'cancelled') return 'error'
  if (status === 'called') return 'warning'
  return 'primary'
}

function canCancel(status: string) {
  return status === 'booked'
}

function canShowQr(status: string) {
  return ['booked', 'checked_in', 'called'].includes(status)
}

async function openQr(bookingId: string) {
  actionError.value = ''
  selectedBookingId.value = bookingId
  detailOpen.value = true
  try {
    await refreshQr()
  }
  catch (error: any) {
    actionError.value = error?.data?.statusMessage || error?.message || 'Gagal memuat QR booking'
  }
}

async function cancelBooking(bookingId: string) {
  actionError.value = ''
  cancellingId.value = bookingId
  try {
    await $fetch(`/api/bookings/${bookingId}/cancel`, { method: 'PATCH' })
    toast.add({ title: 'Booking dibatalkan', description: 'Riwayat booking sudah diperbarui', color: 'success' })
    await refresh()
    if (selectedBookingId.value === bookingId) {
      detailOpen.value = false
      selectedBookingId.value = ''
    }
  }
  catch (error: any) {
    actionError.value = error?.data?.statusMessage || error?.message || 'Gagal membatalkan booking'
    toast.add({ title: 'Pembatalan gagal', description: actionError.value, color: 'error' })
  }
  finally {
    cancellingId.value = ''
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 px-4 pb-6 sm:px-0">
    <UPageGrid>
      <UPageCard v-for="item in stats" :key="item.label" :title="item.label" :description="item.value" :icon="item.icon" />
    </UPageGrid>

    <UPageCard v-if="actionError" class="border border-error/30">
      <p class="font-semibold text-error">{{ actionError }}</p>
    </UPageCard>

    <UPageCard title="Riwayat booking" description="Data booking pasien dari akun yang sedang login.">
      <div class="history-table overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="border-b border-default text-left text-muted">
            <tr>
              <th class="px-4 py-3 font-medium">ID</th>
              <th class="px-4 py-3 font-medium">Dokter</th>
              <th class="px-4 py-3 font-medium">Tanggal</th>
              <th class="px-4 py-3 font-medium">Jam</th>
              <th class="px-4 py-3 font-medium">Status</th>
              <th class="px-4 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!pending && rows.length === 0" class="border-b border-default/60 last:border-b-0">
              <td colspan="6" class="px-4 py-8 text-center text-muted">Belum ada riwayat booking.</td>
            </tr>
            <tr v-for="row in rows" :key="row.id" class="border-b border-default/60 last:border-b-0">
              <td class="px-4 py-3 font-mono text-xs">{{ row.id }}</td>
              <td class="px-4 py-3">
                <p class="font-medium">{{ row.doctor?.fullName || '-' }}</p>
                <p class="text-xs text-muted">{{ row.doctor?.specialty || 'Dokter klinik' }}</p>
              </td>
              <td class="px-4 py-3 text-muted">{{ formatDate(row.scheduleDate) }}</td>
              <td class="px-4 py-3">{{ row.scheduleTime }}</td>
              <td class="px-4 py-3"><UBadge :color="getStatusColor(row.status)" variant="subtle">{{ row.status }}</UBadge></td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <UButton v-if="canShowQr(row.status)" color="neutral" variant="ghost" icon="i-lucide-qr-code" @click="openQr(row.id)">
                    QR
                  </UButton>
                  <UButton v-if="canCancel(row.status)" color="error" variant="ghost" icon="i-lucide-x" :loading="cancellingId === row.id" @click="cancelBooking(row.id)">
                    Batal
                  </UButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UPageCard>

    <UModal v-model:open="detailOpen" :ui="{ content: 'sm:max-w-xl' }" title="QR Booking">
      <template #body>
        <div class="space-y-4">
          <div v-if="qrPending" class="rounded-2xl border border-default px-4 py-6 text-center text-sm text-muted">
            Memuat QR booking...
          </div>
          <template v-else-if="qrData?.data">
            <div class="rounded-3xl border border-default bg-elevated/40 p-4 sm:p-5">
              <div class="grid gap-3 text-sm sm:grid-cols-2">
                <div class="rounded-2xl border border-default bg-white/70 p-3"><p class="text-muted">Booking ID</p><p class="mt-1 break-all font-medium">{{ qrData.data.id }}</p></div>
                <div class="rounded-2xl border border-default bg-white/70 p-3"><p class="text-muted">Dokter</p><p class="mt-1 font-medium">{{ qrData.data.doctor?.fullName || '-' }}</p></div>
                <div class="rounded-2xl border border-default bg-white/70 p-3"><p class="text-muted">Jadwal</p><p class="mt-1 font-medium">{{ formatDate(qrData.data.scheduleDate) }} • {{ qrData.data.scheduleTime }}</p></div>
                <div class="rounded-2xl border border-default bg-white/70 p-3"><p class="text-muted">Status</p><UBadge class="mt-2" :color="getStatusColor(qrData.data.status)" variant="subtle">{{ qrData.data.status }}</UBadge></div>
              </div>
              <div class="mt-5 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-6 text-center">
                <p class="text-xs uppercase tracking-[0.24em] text-primary/80">QR Booking</p>
                <img :src="getBookingQrCodeUrl(qrData.data.id, 220)" alt="QR Booking" class="mx-auto mt-4 w-full max-w-[220px] rounded-2xl bg-white p-3" />
                <p class="mt-3 text-xs text-muted">Tunjukkan QR ini ke staff untuk scan kamera.</p>
              </div>
            </div>
          </template>
          <div v-else class="rounded-2xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
            Data QR tidak tersedia.
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton label="Tutup" color="neutral" variant="ghost" @click="detailOpen = false" />
          <UButton
            v-if="qrData?.data && canCancel(qrData.data.status)"
            label="Batalkan Booking"
            color="error"
            variant="soft"
            :loading="cancellingId === qrData.data.id"
            @click="cancelBooking(qrData.data.id)"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
@media (max-width: 767px) {
  .history-table table thead {
    display: none;
  }

  .history-table table,
  .history-table tbody,
  .history-table tr,
  .history-table td {
    display: block;
    width: 100%;
  }

  .history-table tr {
    margin-bottom: 1rem;
    overflow: hidden;
    border: 1px solid rgb(226 232 240);
    border-radius: 1rem;
    background: white;
  }

  .history-table td {
    padding: 0.875rem 1rem;
    border-bottom: 1px solid rgb(241 245 249);
  }

  .history-table td:last-child {
    border-bottom: none;
  }

  .history-table td .flex.justify-end {
    justify-content: stretch;
    flex-wrap: wrap;
  }

  .history-table td .flex.justify-end > * {
    flex: 1 1 0%;
  }
}
</style>
