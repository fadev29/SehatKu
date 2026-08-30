<script setup lang="ts">
import { getBookingQrCodeUrl } from '~~/app/utils/qr-code'

definePageMeta({ middleware: 'auth', role: 'patient' })

type Clinic = { id: string; name: string; address?: string | null }
type Service = { id: string; name: string; description?: string | null }
type Doctor = { id: string; fullName: string; specialization?: string | null; service?: { name: string } | null }
type Schedule = { id: string; scheduleDate: string; startTime: string; endTime: string; doctor?: { fullName?: string | null } | null }
type SelectOption = { label: string; value: string }
type Booking = {
  id: string
  status: string
  scheduleDate: string
  scheduleTime: string
  heightCm?: number | null
  weightKg?: number | null
  bmiResult?: number | null
  createdAt?: string
  qrToken?: string | null
  doctor?: { fullName?: string | null; specialization?: string | null } | null
  checkIn?: {
    queue?: { id: string; queueNumber: string; status: string } | null
  } | null
}

type ApiList<T> = { data?: T[] }
type ApiItem<T> = { data?: T }

const toast = useToast()
const today = new Date().toISOString().slice(0, 10)
const selectedClinicId = ref('')
const selectedServiceId = ref('')
const selectedDoctorId = ref('')
const submitting = ref(false)
const bookingError = ref('')
const bookingSuccess = ref('')
const detailOpen = ref(false)
const selectedBookingId = ref('')
const detailError = ref('')

const form = reactive({
  clinicId: '',
  doctorId: '',
  scheduleDate: today,
  scheduleTime: '',
  heightCm: 168,
  weightKg: 62,
})

const { data: clinicsData } = await useFetch<ApiList<Clinic>>('/api/clinics')
const clinics = computed(() => clinicsData.value?.data ?? [])
const clinicOptions = computed<SelectOption[]>(() => clinics.value.map((item) => ({ label: item.name, value: item.id })))
const selectedClinic = computed(() => clinics.value.find((item) => item.id === selectedClinicId.value) ?? null)


const { data: servicesData, pending: servicesPending, refresh: refreshServices } = await useFetch<ApiList<Service>>('/api/services', {
  query: computed(() => selectedClinicId.value ? { clinicId: selectedClinicId.value } : undefined),
  immediate: false,
})
const services = computed(() => servicesData.value?.data ?? [])
const serviceOptions = computed<SelectOption[]>(() => services.value.map((item) => ({ label: item.name, value: item.id })))

const { data: doctorsData, pending: doctorsPending, refresh: refreshDoctors } = await useFetch<ApiList<Doctor>>('/api/doctors', {
  query: computed(() => {
    if (!selectedClinicId.value) return undefined
    return {
      clinicId: selectedClinicId.value,
      ...(selectedServiceId.value ? { serviceId: selectedServiceId.value } : {}),
    }
  }),
  immediate: false,
})
const doctors = computed(() => doctorsData.value?.data ?? [])
const doctorOptions = computed<SelectOption[]>(() => doctors.value.map((item) => ({ label: item.fullName, value: item.id })))

const { data: schedulesData, pending: schedulesPending, refresh: refreshSchedules } = await useFetch<ApiList<Schedule>>('/api/schedules', {
  query: computed(() => {
    if (!selectedClinicId.value || !selectedDoctorId.value || !form.scheduleDate) return undefined
    return {
      clinicId: selectedClinicId.value,
      doctorId: selectedDoctorId.value,
      date: form.scheduleDate,
    }
  }),
  immediate: false,
})
const schedules = computed(() => schedulesData.value?.data ?? [])
const scheduleOptions = computed<SelectOption[]>(() => schedules.value.map((item) => ({ label: `${item.startTime} • ${item.endTime}`, value: item.startTime })))

const { data: bookingsData, pending: bookingsPending, refresh: refreshBookings } = await useFetch<ApiList<Booking>>('/api/bookings/me')
const bookings = computed(() => bookingsData.value?.data ?? [])
const activeBookings = computed(() => bookings.value.filter((item) => ['booked', 'checked_in', 'called'].includes(item.status)))
const hasLookupData = computed(() => clinics.value.length > 0)
const formDisabled = computed(() => !hasLookupData.value || servicesPending.value || doctorsPending.value || schedulesPending.value)
const lookupHint = computed(() => {
  if (!clinics.value.length) return 'Data klinik belum ada. Jalankan seed database dulu.'
  if (selectedClinicId.value && !services.value.length) return 'Belum ada layanan aktif untuk klinik ini.'
  if (selectedClinicId.value && !doctors.value.length) return 'Belum ada dokter aktif untuk filter ini.'
  if (selectedDoctorId.value && !schedules.value.length) return 'Belum ada jadwal di tanggal ini.'
  return ''
})

const { data: bookingDetailData, pending: detailPending, refresh: refreshDetail } = await useFetch<ApiItem<Booking>>(
  () => selectedBookingId.value ? `/api/bookings/${selectedBookingId.value}` : '/api/bookings/placeholder',
  { immediate: false },
)

const selectedService = computed(() => services.value.find((item) => item.id === selectedServiceId.value) ?? null)
const selectedDoctor = computed(() => doctors.value.find((item) => item.id === selectedDoctorId.value) ?? null)
const selectedSchedule = computed(() => schedules.value.find((item) => item.startTime === form.scheduleTime) ?? null)

const bmi = computed(() => {
  const meter = Number(form.heightCm) / 100
  return meter > 0 ? (Number(form.weightKg) / (meter * meter)).toFixed(1) : '0.0'
})
onMounted(() => {
  refreshServices()
  refreshDoctors()
  refreshSchedules()
})

let bookingRefreshTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  bookingRefreshTimer = setInterval(() => {
    refreshBookings()
    if (detailOpen.value && selectedBookingId.value) refreshDetail()
  }, 15000)
})

onBeforeUnmount(() => {
  if (bookingRefreshTimer) clearInterval(bookingRefreshTimer)
})

const stats = computed(() => {
  const booked = bookings.value.filter((item) => item.status === 'booked').length
  const checkedIn = bookings.value.filter((item) => item.status === 'checked_in').length
  const queued = bookings.value.filter((item) => item.checkIn?.queue?.queueNumber).length
  return [
    { label: 'Booking aktif', value: String(activeBookings.value.length), icon: 'i-lucide-calendar-check-2' },
    { label: 'QR siap pakai', value: String(booked), icon: 'i-lucide-qr-code' },
    { label: 'Sudah check-in', value: String(checkedIn), icon: 'i-lucide-clipboard-check' },
    { label: 'Nomor antrean', value: String(queued), icon: 'i-lucide-ticket' },
  ]
})

watch(selectedClinicId, async (value) => {
  form.clinicId = value
  selectedServiceId.value = ''
  selectedDoctorId.value = ''
  form.doctorId = ''
  form.scheduleTime = ''
  if (!value) return
  await Promise.all([refreshServices(), refreshDoctors()])
})

watch(selectedServiceId, async () => {
  selectedDoctorId.value = ''
  form.doctorId = ''
  form.scheduleTime = ''
  if (!selectedClinicId.value) return
  await refreshDoctors()
})

watch(selectedDoctorId, async (value) => {
  form.doctorId = value
  form.scheduleTime = ''
  if (!value || !selectedClinicId.value || !form.scheduleDate) return
  await refreshSchedules()
})

watch(() => form.scheduleDate, async (value) => {
  form.scheduleTime = ''
  if (!value || !selectedClinicId.value || !selectedDoctorId.value) return
  await refreshSchedules()
})

watch(clinics, (items) => {
  if (items.length > 0 && !selectedClinicId.value) {
    selectedClinicId.value = items[0].id
  }
}, { immediate: true, deep: true })

function getStatusColor(status: string) {
  if (status === 'checked_in' || status === 'finished') return 'success'
  if (status === 'cancelled') return 'error'
  if (status === 'called') return 'warning'
  return 'primary'
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

async function openDetail(bookingId: string) {
  detailError.value = ''
  selectedBookingId.value = bookingId
  detailOpen.value = true

  try {
    await refreshDetail()
  }
  catch (error: any) {
    detailError.value = error?.data?.statusMessage || error?.message || 'Gagal memuat detail booking'
  }
}

async function submitBooking() {
  bookingError.value = ''
  bookingSuccess.value = ''

  if (!form.clinicId || !form.doctorId || !form.scheduleDate || !form.scheduleTime) {
    bookingError.value = 'Klinik, dokter, tanggal, dan jam wajib dipilih'
    return
  }

  if (Number(form.heightCm) <= 0 || Number(form.weightKg) <= 0) {
    bookingError.value = 'Tinggi dan berat badan wajib valid'
    return
  }

  submitting.value = true

  try {
    await $fetch<ApiItem<Booking>>('/api/bookings', {
      method: 'POST',
      body: {
        clinicId: form.clinicId,
        doctorId: form.doctorId,
        scheduleDate: form.scheduleDate,
        scheduleTime: form.scheduleTime,
        heightCm: Number(form.heightCm),
        weightKg: Number(form.weightKg),
      },
    })

    bookingSuccess.value = 'Booking berhasil dibuat'
    toast.add({ title: 'Booking berhasil', description: 'QR booking siap dipakai saat check-in', color: 'success' })
    await refreshBookings()
  }
  catch (error: any) {
    bookingError.value = error?.data?.statusMessage || error?.message || 'Gagal membuat booking'
    toast.add({ title: 'Booking gagal', description: bookingError.value, color: 'error' })
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 px-4 pb-6 sm:px-0">
    <UPageGrid>
      <UPageCard v-for="item in stats" :key="item.label" :title="item.label" :description="item.value" :icon="item.icon" />
    </UPageGrid>

    <div class="grid gap-6 xl:grid-cols-[1.1fr_minmax(0,0.9fr)]">
      <UPageCard title="Booking pasien" description="Pilih klinik, dokter, jadwal, lalu simpan booking pasien.">
        <div class="space-y-4">
          <div v-if="bookingSuccess" class="rounded-2xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
            {{ bookingSuccess }}
          </div>
          <div v-if="bookingError" class="rounded-2xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
            {{ bookingError }}
          </div>
          <div v-else-if="lookupHint" class="rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
            {{ lookupHint }}
          </div>

          <div class="booking-form-grid grid gap-4 sm:grid-cols-2">
            <UFormField label="Klinik" required>
              <USelectMenu
                v-model="selectedClinicId"
                value-key="value"
                option-attribute="label"
                :items="clinicOptions"
                placeholder="Pilih klinik"
                :disabled="!clinicOptions.length"
              >
                <template #label>
                  {{ selectedClinic?.name || 'Pilih klinik' }}
                </template>
              </USelectMenu>
            </UFormField>

            <UFormField label="Layanan">
              <USelectMenu
                v-model="selectedServiceId"
                value-key="value"
                option-attribute="label"
                :items="serviceOptions"
                :loading="servicesPending"
                :disabled="!serviceOptions.length"
                placeholder="Pilih layanan"
              >
                <template #label>
                  {{ selectedService?.name || 'Semua layanan' }}
                </template>
              </USelectMenu>
            </UFormField>

            <UFormField label="Dokter" required>
              <USelectMenu
                v-model="selectedDoctorId"
                value-key="value"
                option-attribute="label"
                :items="doctorOptions"
                :loading="doctorsPending"
                :disabled="!doctorOptions.length"
                placeholder="Pilih dokter"
              >
                <template #label>
                  {{ selectedDoctor?.fullName || 'Pilih dokter' }}
                </template>
              </USelectMenu>
            </UFormField>

            <UFormField label="Tanggal" required>
              <UInput v-model="form.scheduleDate" type="date" />
            </UFormField>

            <UFormField label="Jam praktik" required>
              <USelectMenu
                v-model="form.scheduleTime"
                value-key="value"
                option-attribute="label"
                :items="scheduleOptions"
                :loading="schedulesPending"
                :disabled="!scheduleOptions.length"
                placeholder="Pilih jam"
              >
                <template #label>
                  {{ form.scheduleTime || 'Pilih jam' }}
                </template>
              </USelectMenu>
            </UFormField>

            <UFormField label="Tinggi badan (cm)" required>
              <UInput v-model="form.heightCm" type="number" min="1" />
            </UFormField>

            <UFormField label="Berat badan (kg)" required>
              <UInput v-model="form.weightKg" type="number" min="1" />
            </UFormField>

            <UFormField label="BMI otomatis">
              <UInput :model-value="bmi" disabled />
            </UFormField>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <UButton icon="i-lucide-calendar-plus" :loading="submitting" :disabled="formDisabled" @click="submitBooking">
              Simpan booking
            </UButton>
            <UBadge color="primary" variant="subtle">
              QR dibuat otomatis setelah booking berhasil
            </UBadge>
          </div>
        </div>
      </UPageCard>

      <UPageCard title="Ringkasan booking" description="Preview data booking pasien sebelum disimpan.">
        <div class="grid gap-3 text-sm sm:grid-cols-2">
          <div class="rounded-2xl border border-default bg-elevated/40 p-3"><p class="text-muted">Klinik</p><p class="mt-1 font-medium">{{ selectedClinic?.name || '-' }}</p></div>
          <div class="rounded-2xl border border-default bg-elevated/40 p-3"><p class="text-muted">Layanan</p><p class="mt-1 font-medium">{{ selectedService?.name || 'Semua layanan' }}</p></div>
          <div class="rounded-2xl border border-default bg-elevated/40 p-3"><p class="text-muted">Dokter</p><p class="mt-1 font-medium">{{ selectedDoctor?.fullName || '-' }}</p></div>
          <div class="rounded-2xl border border-default bg-elevated/40 p-3"><p class="text-muted">Spesialis</p><p class="mt-1 font-medium">{{ selectedDoctor?.specialization || '-' }}</p></div>
          <div class="rounded-2xl border border-default bg-elevated/40 p-3"><p class="text-muted">Jadwal</p><p class="mt-1 font-medium">{{ form.scheduleDate }} • {{ form.scheduleTime || '-' }}</p></div>
          <div class="rounded-2xl border border-default bg-elevated/40 p-3"><p class="text-muted">Estimasi selesai</p><p class="mt-1 font-medium">{{ selectedSchedule?.endTime || '-' }}</p></div>
          <div class="rounded-2xl border border-default bg-elevated/40 p-3 sm:col-span-2"><p class="text-muted">BMI</p><p class="mt-1 font-medium">{{ bmi }}</p></div>
        </div>
      </UPageCard>
    </div>

    <UPageCard title="Booking aktif" description="Daftar booking pasien yang masih berjalan.">
      <div class="booking-table overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="border-b border-default text-left text-muted">
            <tr>
              <th class="px-4 py-3 font-medium">ID</th>
              <th class="px-4 py-3 font-medium">Dokter</th>
              <th class="px-4 py-3 font-medium">Tanggal</th>
              <th class="px-4 py-3 font-medium">Jam</th>
              <th class="px-4 py-3 font-medium">Antrean</th>
              <th class="px-4 py-3 font-medium">Status</th>
              <th class="px-4 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!bookingsPending && activeBookings.length === 0" class="border-b border-default/60 last:border-b-0">
              <td colspan="7" class="px-4 py-6 text-center text-muted">Belum ada booking aktif.</td>
            </tr>
            <tr v-for="row in activeBookings" :key="row.id" class="border-b border-default/60 last:border-b-0">
              <td class="px-4 py-3 font-mono text-xs">{{ row.id }}</td>
              <td class="px-4 py-3">{{ row.doctor?.fullName || '-' }}</td>
              <td class="px-4 py-3 text-muted">{{ formatDate(row.scheduleDate) }}</td>
              <td class="px-4 py-3">{{ row.scheduleTime }}</td>
              <td class="px-4 py-3">{{ row.checkIn?.queue?.queueNumber || '-' }}</td>
              <td class="px-4 py-3"><UBadge :color="getStatusColor(row.checkIn?.queue?.status || row.status)" variant="subtle">{{ row.checkIn?.queue?.status || row.status }}</UBadge></td>
              <td class="px-4 py-3">
                <div class="flex justify-end">
                  <UButton color="neutral" variant="ghost" icon="i-lucide-eye" @click="openDetail(row.id)">
                    Detail
                  </UButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UPageCard>


    <UModal v-model:open="detailOpen" :ui="{ content: 'sm:max-w-2xl' }" title="Detail Booking">
      <template #body>
        <div class="space-y-4">
          <div v-if="detailPending" class="rounded-2xl border border-default px-4 py-6 text-center text-sm text-muted">
            Memuat detail booking...
          </div>
          <div v-else-if="detailError" class="rounded-2xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
            {{ detailError }}
          </div>
          <div v-else-if="bookingDetailData?.data" class="rounded-3xl border border-default bg-elevated/40 p-4 sm:p-5">
            <div class="grid gap-3 text-sm sm:grid-cols-2">
              <div class="rounded-2xl border border-default bg-white/70 p-3"><p class="text-muted">Booking ID</p><p class="mt-1 break-all font-medium">{{ bookingDetailData.data.id }}</p></div>
              <div class="rounded-2xl border border-default bg-white/70 p-3"><p class="text-muted">Dokter</p><p class="mt-1 font-medium">{{ bookingDetailData.data.doctor?.fullName || '-' }}</p></div>
              <div class="rounded-2xl border border-default bg-white/70 p-3"><p class="text-muted">Tanggal</p><p class="mt-1 font-medium">{{ formatDate(bookingDetailData.data.scheduleDate) }}</p></div>
              <div class="rounded-2xl border border-default bg-white/70 p-3"><p class="text-muted">Jam</p><p class="mt-1 font-medium">{{ bookingDetailData.data.scheduleTime }}</p></div>
              <div class="rounded-2xl border border-default bg-white/70 p-3"><p class="text-muted">Tinggi / Berat</p><p class="mt-1 font-medium">{{ bookingDetailData.data.heightCm || '-' }} cm / {{ bookingDetailData.data.weightKg || '-' }} kg</p></div>
              <div class="rounded-2xl border border-default bg-white/70 p-3"><p class="text-muted">BMI</p><p class="mt-1 font-medium">{{ bookingDetailData.data.bmiResult || '-' }}</p></div>
              <div class="rounded-2xl border border-default bg-white/70 p-3"><p class="text-muted">Nomor antrean</p><p class="mt-1 font-medium">{{ bookingDetailData.data.checkIn?.queue?.queueNumber || '-' }}</p></div>
              <div class="rounded-2xl border border-default bg-white/70 p-3"><p class="text-muted">Status</p><UBadge class="mt-2" :color="getStatusColor(bookingDetailData.data.checkIn?.queue?.status || bookingDetailData.data.status)" variant="subtle">{{ bookingDetailData.data.checkIn?.queue?.status || bookingDetailData.data.status }}</UBadge></div>
            </div>
            <div v-if="bookingDetailData.data.qrToken" class="mt-5 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5 text-center">
              <p class="text-xs uppercase tracking-[0.24em] text-primary/80">QR Booking</p>
              <img :src="getBookingQrCodeUrl(bookingDetailData.data.id, 220)" alt="QR Booking" class="mx-auto mt-4 w-full max-w-[220px] rounded-2xl bg-white p-3" />
              <p class="mt-3 text-xs text-muted">Tunjukkan QR ini ke staff untuk scan kamera.</p>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end">
          <UButton label="Tutup" color="neutral" variant="ghost" @click="detailOpen = false" />
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
@media (max-width: 639px) {
  .booking-form-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 767px) {
  .booking-table table thead {
    display: none;
  }

  .booking-table table,
  .booking-table tbody,
  .booking-table tr,
  .booking-table td {
    display: block;
    width: 100%;
  }

  .booking-table tr {
    margin-bottom: 1rem;
    overflow: hidden;
    border: 1px solid rgb(226 232 240);
    border-radius: 1rem;
    background: white;
  }

  .booking-table td {
    padding: 0.875rem 1rem;
    border-bottom: 1px solid rgb(241 245 249);
  }

  .booking-table td:last-child {
    border-bottom: none;
  }

  .booking-table td .flex.justify-end {
    justify-content: stretch;
  }

  .booking-table td .flex.justify-end > * {
    flex: 1 1 0%;
  }
}
</style>
