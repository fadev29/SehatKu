<script setup lang="ts">
import type { DetectedBarcode } from 'vue-qrcode-reader'
import { QrcodeStream } from 'vue-qrcode-reader'
import { buildQueueTicketBytes } from '~~/app/utils/escpos'
import { useStaffPrinter } from '~~/app/composables/useStaffPrinter'

definePageMeta({ role: 'staff', layout: 'staff' })

type PrinterRow = {
  id: string
  name: string
  serviceUuid: string
  characteristicUuid: string
  writeMode?: string | null
}

type BookingPreview = {
  bookingId: string
  patientName: string
  doctorName: string
  clinicName?: string
  serviceName?: string
  scheduleDate: string
  scheduleTime?: string
  qrToken?: string | null
  queue?: { id: string, queueNumber: string, status: string } | null
}

type BookingRow = {
  id: string
  qrToken: string
  status: string
  scheduleDate: string
  scheduleTime: string
  patient: { fullName: string; phone: string }
  doctor: { fullName: string; clinic?: { name?: string | null } | null; service?: { name?: string | null } | null }
  checkIn?: { queue?: { id: string; queueNumber: string; status: string } | null } | null
}

type QueueRow = {
  id: string
  queueNumber: string
  status: string
  checkIn?: { checkInMethod?: string, booking?: { id?: string; patient?: { fullName?: string | null } | null } | null } | null
  printJobs?: Array<{ id: string, type: string, status: string }>
}

const qrInput = ref('')
const selectedPrinterId = ref('')
const manualKeyword = ref('')
const cameraOpen = ref(false)
const cameraPaused = ref(false)
const cameraReady = ref(false)
const cameraError = ref('')
const loadingScan = ref(false)
const loadingCheckIn = ref(false)
const loadingPrint = ref(false)
const reprintingId = ref('')
const quickCheckInId = ref('')
const errorMessage = ref('')
const selectedBookingId = ref('')
const scannedBooking = ref<BookingPreview | null>(null)
const toast = useToast()
const {
  isBluetoothSupported,
  connectedDeviceName: bluetoothDeviceName,
  connectedPrinterId,
  printerConnectError,
  ensurePrinterConnection,
  writePayload,
} = useStaffPrinter()

const { data: printerData } = await useFetch('/api/staff/printer-profiles')
const { data: queueData, pending: queuePending, refresh: refreshQueues } = await useFetch('/api/staff/queues/today')
const { data: checkInData, pending: checkInPending, refresh: refreshCheckIns } = await useFetch('/api/staff/check-ins/today')
const { data: bookingData, pending: bookingPending, refresh: refreshBookingsToday } = await useFetch('/api/staff/bookings/today')

const printers = computed(() => (printerData.value?.data ?? []) as PrinterRow[])
const rows = computed(() => (queueData.value?.data ?? []) as QueueRow[])
const bookingRows = computed(() => (bookingData.value?.data ?? []) as BookingRow[])
const printerOptions = computed(() => printers.value.map((item) => ({ label: item.name, value: item.id })))
const selectedPrinter = computed(() => printers.value.find((item) => item.id === selectedPrinterId.value) ?? null)
const stats = computed(() => {
  const printCount = rows.value.reduce((count, row) => count + (row.printJobs?.filter((item) => item.type === 'print').length ?? 0), 0)
  const reprintCount = rows.value.reduce((count, row) => count + (row.printJobs?.filter((item) => item.type === 'reprint').length ?? 0), 0)
  return [
    { label: 'Check-in hari ini', value: String((checkInData.value?.data ?? []).length), icon: 'i-lucide-scan-line' },
    { label: 'Antrean dicetak', value: String(printCount), icon: 'i-lucide-printer' },
    { label: 'Reprint', value: String(reprintCount), icon: 'i-lucide-copy' }
  ]
})

async function refreshAll() {
  await Promise.all([refreshQueues(), refreshCheckIns(), refreshBookingsToday()])
}

async function simulateScan() {
  if (!qrInput.value.trim()) {
    errorMessage.value = 'QR token wajib diisi'
    toast.add({ title: 'Scan gagal', description: errorMessage.value, color: 'warning' })
    return
  }

  errorMessage.value = ''
  loadingScan.value = true
  try {
    const result = await $fetch('/api/staff/check-ins/scan', {
      method: 'POST',
      body: { qrToken: qrInput.value.trim() }
    })

    scannedBooking.value = result.data as BookingPreview
    selectedBookingId.value = result.data.bookingId
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.message || 'Scan QR gagal'
    toast.add({ title: 'Scan gagal', description: errorMessage.value, color: 'error' })
  } finally {
    loadingScan.value = false
  }
}

function handleCameraOn() {
  cameraReady.value = true
  cameraError.value = ''
}

function handleCameraOff() {
  cameraReady.value = false
}

function handleCameraError(error: Error) {
  cameraError.value = error.message || 'Kamera tidak bisa dibuka'
}

async function handleDetect(detectedCodes: DetectedBarcode[]) {
  const rawValue = detectedCodes[0]?.rawValue?.trim()
  if (!rawValue || cameraPaused.value || loadingScan.value) return

  cameraPaused.value = true
  qrInput.value = rawValue
  await simulateScan()

  if (selectedBookingId.value) {
    await runCheckIn(selectedBookingId.value, 'qr')

    if (scannedBooking.value?.queue?.id && selectedPrinter.value) {
      await printCurrentTicket({ silent: true })
      toast.add({ title: 'Scan, check-in, print berhasil', description: `Tiket langsung dicetak ke ${selectedPrinter.value.name}`, color: 'success' })
    }
  }

  cameraOpen.value = false
  cameraReady.value = false

  setTimeout(() => {
    cameraPaused.value = false
  }, 1200)
}

async function searchManual() {
  if (!manualKeyword.value.trim()) {
    errorMessage.value = 'Kata kunci pencarian wajib diisi'
    toast.add({ title: 'Cari manual gagal', description: errorMessage.value, color: 'warning' })
    return
  }

  errorMessage.value = ''
  loadingScan.value = true
  try {
    const result = await $fetch('/api/staff/check-ins/manual-search', {
      method: 'POST',
      body: { keyword: manualKeyword.value.trim() }
    })

    const first = result.data?.[0]
    if (!first) {
      errorMessage.value = 'Booking tidak ditemukan'
      toast.add({ title: 'Booking tidak ditemukan', description: errorMessage.value, color: 'warning' })
      return
    }

    scannedBooking.value = {
      bookingId: first.id,
      patientName: first.patient.fullName,
      doctorName: first.doctor.fullName,
      clinicName: first.doctor.clinic?.name || 'Sehatku',
      serviceName: first.doctor.service?.name || '-',
      scheduleDate: first.scheduleDate,
      scheduleTime: first.scheduleTime,
      qrToken: first.qrToken,
      queue: first.checkIn?.queue ?? null
    }
    selectedBookingId.value = first.id
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.message || 'Pencarian manual gagal'
    toast.add({ title: 'Pencarian gagal', description: errorMessage.value, color: 'error' })
  } finally {
    loadingScan.value = false
  }
}

async function runCheckIn(bookingId: string, checkInMethod: 'qr' | 'manual' = 'manual') {
  errorMessage.value = ''
  loadingCheckIn.value = true
  quickCheckInId.value = bookingId
  try {
    const result = await $fetch('/api/staff/queues', {
      method: 'POST',
      body: {
        bookingId,
        checkInMethod,
      }
    })

    if (scannedBooking.value?.bookingId === bookingId) {
      scannedBooking.value.queue = result.data.queue
    }

    toast.add({
      title: result.data.reused ? 'Check-in dipakai ulang' : 'Check-in berhasil',
      description: `Nomor antrean ${result.data.queue.queueNumber} siap dicetak`,
      color: 'success'
    })
    await refreshAll()
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.message || 'Check-in gagal'
    toast.add({ title: 'Check-in gagal', description: errorMessage.value, color: 'error' })
  } finally {
    loadingCheckIn.value = false
    quickCheckInId.value = ''
  }
}

async function simulateCheckIn() {
  if (!selectedBookingId.value) {
    errorMessage.value = 'Pilih booking dulu'
    toast.add({ title: 'Check-in gagal', description: errorMessage.value, color: 'warning' })
    return
  }

  await runCheckIn(selectedBookingId.value, qrInput.value.trim() ? 'qr' : 'manual')
}

function ticketPayloadFromPreview() {
  if (!scannedBooking.value?.queue?.queueNumber) return null

  return {
    clinicName: scannedBooking.value.clinicName || 'Sehatku',
    queueNumber: scannedBooking.value.queue.queueNumber,
    patientName: scannedBooking.value.patientName || '-',
    doctorName: scannedBooking.value.doctorName || '-',
    serviceName: scannedBooking.value.serviceName || '-',
    scheduleDate: scannedBooking.value.scheduleDate ? new Date(scannedBooking.value.scheduleDate).toLocaleDateString('id-ID') : '-',
    scheduleTime: scannedBooking.value.scheduleTime || '-',
    qrToken: scannedBooking.value.qrToken || '-',
    footerText: `Klinik ${scannedBooking.value.clinicName || 'Sehatku'}`,
    printedAt: new Date().toLocaleString('id-ID')
  }
}

async function reprintTicket(printJobId: string) {
  if (!selectedPrinter.value) {
    errorMessage.value = 'Pilih printer dulu'
    toast.add({ title: 'Printer belum dipilih', description: errorMessage.value, color: 'warning' })
    return
  }

  const payload = ticketPayloadFromPreview()
  if (!payload) {
    errorMessage.value = 'Pilih antrean dulu untuk reprint'
    toast.add({ title: 'Reprint gagal', description: errorMessage.value, color: 'warning' })
    return
  }

  errorMessage.value = ''
  reprintingId.value = printJobId
  try {
    await writePayload(selectedPrinter.value, buildQueueTicketBytes(payload))
    await $fetch(`/api/staff/print-jobs/${printJobId}/reprint`, { method: 'POST' })
    toast.add({ title: 'Reprint berhasil', description: `Tiket dicetak ulang ke ${selectedPrinter.value.name}`, color: 'success' })
    await refreshQueues()
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.message || 'Reprint tiket gagal'
    toast.add({ title: 'Reprint gagal', description: errorMessage.value, color: 'error' })
  } finally {
    reprintingId.value = ''
  }
}

async function printCurrentTicket(options: { silent?: boolean } = {}) {
  if (!scannedBooking.value?.queue?.id) {
    errorMessage.value = 'Nomor antrean belum ada'
    if (!options.silent) toast.add({ title: 'Print gagal', description: errorMessage.value, color: 'warning' })
    return
  }

  if (!selectedPrinter.value) {
    errorMessage.value = 'Pilih printer dulu'
    if (!options.silent) toast.add({ title: 'Print gagal', description: errorMessage.value, color: 'warning' })
    return
  }

  const payload = ticketPayloadFromPreview()
  if (!payload) {
    errorMessage.value = 'Data tiket belum lengkap'
    if (!options.silent) toast.add({ title: 'Print gagal', description: errorMessage.value, color: 'warning' })
    return
  }

  errorMessage.value = ''
  loadingPrint.value = true
  try {
    await writePayload(selectedPrinter.value, buildQueueTicketBytes(payload))
    await $fetch('/api/staff/print-jobs', {
      method: 'POST',
      body: {
        queueId: scannedBooking.value.queue.id,
        printerProfileId: selectedPrinter.value.id,
        type: 'print',
        status: 'success'
      }
    })

    if (!options.silent) {
      toast.add({ title: 'Print berhasil', description: `Tiket dicetak ke ${selectedPrinter.value.name}${bluetoothDeviceName.value ? ` • ${bluetoothDeviceName.value}` : ''}`, color: 'success' })
    }
    await refreshQueues()
  } catch (error: any) {
    const message = error?.data?.statusMessage || error?.message || 'Print tiket gagal'
    errorMessage.value = message
    await $fetch('/api/staff/print-jobs', {
      method: 'POST',
      body: {
        queueId: scannedBooking.value.queue.id,
        printerProfileId: selectedPrinter.value.id,
        type: 'print',
        status: 'failed',
        errorMessage: message
      }
    }).catch(() => null)
    if (!options.silent) toast.add({ title: 'Print gagal', description: message, color: 'error' })
  } finally {
    loadingPrint.value = false
  }
}

async function simulatePrint() {
  await printCurrentTicket()
}

function printerName(id?: string) {
  return printers.value.find((item) => item.id === id)?.name || '-'
}

async function testPrint() {
  if (!selectedPrinter.value) {
    errorMessage.value = 'Pilih printer dulu'
    toast.add({ title: 'Printer belum dipilih', description: errorMessage.value, color: 'warning' })
    return
  }

  loadingPrint.value = true
  errorMessage.value = ''
  try {
    await ensurePrinterConnection(selectedPrinter.value)
    const payload = {
      clinicName: 'Sehatku Test Print',
      queueNumber: 'TEST-001',
      patientName: 'Pasien Uji Coba',
      doctorName: 'dr. Demo Printer',
      serviceName: 'Poli Uji Coba',
      scheduleDate: new Date().toLocaleDateString('id-ID'),
      scheduleTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      qrToken: 'TEST-QR-THERMAL',
      footerText: 'Cetak sample staff',
      printedAt: new Date().toLocaleString('id-ID')
    }

    await writePayload(selectedPrinter.value, buildQueueTicketBytes(payload))
    toast.add({ title: 'Tes print berhasil', description: `Sample dicetak ke ${selectedPrinter.value.name}`, color: 'success' })
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.message || printerConnectError.value || 'Tes print gagal'
    toast.add({ title: 'Tes print gagal', description: errorMessage.value, color: 'error' })
  } finally {
    loadingPrint.value = false
  }
}

function selectBooking(row: BookingRow) {
  errorMessage.value = ''
  selectedBookingId.value = row.id
  qrInput.value = row.qrToken || ''
  manualKeyword.value = row.patient.fullName
  scannedBooking.value = {
    bookingId: row.id,
    patientName: row.patient.fullName,
    doctorName: row.doctor.fullName,
    clinicName: row.doctor.clinic?.name || 'Sehatku',
    serviceName: row.doctor.service?.name || '-',
    scheduleDate: row.scheduleDate,
    scheduleTime: row.scheduleTime,
    qrToken: row.qrToken,
    queue: row.checkIn?.queue ?? null,
  }
}

watch(selectedPrinterId, (value) => {
  if (!value) return
  if (connectedPrinterId.value && connectedPrinterId.value !== value) {
    bluetoothDeviceName.value = ''
  }
})
</script>

<template>
  <div class="space-y-6">
    <UPageGrid>
      <UPageCard v-for="item in stats" :key="item.label" :title="item.label" :description="item.value" :icon="item.icon" />
    </UPageGrid>

    <div v-if="errorMessage" class="rounded-2xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{{ errorMessage }}</div>

    <div v-if="cameraError" class="rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">{{ cameraError }}</div>

    <div v-if="!isBluetoothSupported" class="rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">Web Bluetooth belum didukung di browser ini. Gunakan Chrome di Android untuk print thermal BLE.</div>

    <div class="grid gap-6 lg:grid-cols-[1fr_minmax(0,0.9fr)]">
      <UPageCard title="Scan QR / Cari Manual" description="Alur nyata ke endpoint staff untuk scan, check-in, dan print tiket.">
        <div class="grid gap-4 md:grid-cols-2">
          <UFormField label="QR booking"><UInput v-model="qrInput" /></UFormField>
          <UFormField label="Pilih printer"><USelectMenu v-model="selectedPrinterId" value-key="value" option-attribute="label" :items="printerOptions" /></UFormField>
          <UFormField class="md:col-span-2" label="Cari manual"><UInput v-model="manualKeyword" placeholder="Nama atau telepon pasien" /></UFormField>
        </div>

        <div class="scan-actions-grid mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <UButton icon="i-lucide-scan-line" :loading="loadingScan" @click="simulateScan">Scan QR</UButton>
          <UButton icon="i-lucide-camera" color="primary" variant="outline" @click="cameraOpen = !cameraOpen">{{ cameraOpen ? 'Tutup Kamera' : 'Scan Kamera' }}</UButton>
          <UButton icon="i-lucide-search" color="neutral" variant="outline" :loading="loadingScan" @click="searchManual">Cari Manual</UButton>
          <UButton icon="i-lucide-badge-check" color="warning" :loading="loadingCheckIn" :disabled="!selectedBookingId" @click="simulateCheckIn">Check-in</UButton>
          <UButton icon="i-lucide-printer" color="success" :loading="loadingPrint" :disabled="!scannedBooking?.queue?.id || !selectedPrinterId" @click="simulatePrint">Print Tiket</UButton>
          <UButton icon="i-lucide-receipt-text" color="neutral" variant="outline" :loading="loadingPrint" :disabled="!selectedPrinterId" @click="testPrint">Tes Print</UButton>
        </div>

        <ClientOnly>
          <div v-if="cameraOpen" class="mt-5 overflow-hidden rounded-2xl border border-default bg-black">
            <QrcodeStream
              :paused="cameraPaused"
              :formats="['qr_code']"
              :constraints="{ facingMode: 'environment' }"
              @detect="handleDetect"
              @camera-on="handleCameraOn"
              @camera-off="handleCameraOff"
              @error="handleCameraError"
            />
            <div class="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-sm text-white">
              <span>{{ cameraReady ? 'Kamera siap. Arahkan ke QR booking pasien.' : 'Menyalakan kamera...' }}</span>
              <UBadge :color="cameraReady ? 'success' : 'warning'" variant="subtle">{{ cameraReady ? 'Siap' : 'Loading' }}</UBadge>
            </div>
          </div>
        </ClientOnly>

      </UPageCard>

      <UPageCard title="Preview pasien" description="Hasil scan atau pencarian booking hari ini.">
        <div class="space-y-3 text-sm">
          <div class="flex justify-between gap-4"><span class="text-muted">Nama</span><span class="font-medium">{{ scannedBooking?.patientName || '-' }}</span></div>
          <div class="flex justify-between gap-4"><span class="text-muted">Booking</span><span class="font-medium">{{ scannedBooking?.bookingId || '-' }}</span></div>
          <div class="flex justify-between gap-4"><span class="text-muted">Dokter</span><span class="font-medium">{{ scannedBooking?.doctorName || '-' }}</span></div>
          <div class="flex justify-between gap-4"><span class="text-muted">Poli</span><span class="font-medium">{{ scannedBooking?.serviceName || '-' }}</span></div>
          <div class="flex justify-between gap-4"><span class="text-muted">Klinik</span><span class="font-medium">{{ scannedBooking?.clinicName || '-' }}</span></div>
          <div class="flex justify-between gap-4"><span class="text-muted">Jam booking</span><span class="font-medium">{{ scannedBooking?.scheduleTime || '-' }}</span></div>
          <div class="flex justify-between gap-4"><span class="text-muted">Nomor antrean</span><span class="font-medium">{{ scannedBooking?.queue?.queueNumber || '-' }}</span></div>
          <div class="flex justify-between gap-4"><span class="text-muted">Printer</span><span class="font-medium">{{ printerName(selectedPrinterId) }}</span></div>
          <div class="flex justify-between gap-4"><span class="text-muted">BLE Device</span><span class="font-medium">{{ bluetoothDeviceName || '-' }}</span></div>
          <div class="flex justify-between gap-4"><span class="text-muted">Status</span><UBadge color="primary" variant="subtle">{{ scannedBooking?.queue?.status || 'Belum diproses' }}</UBadge></div>
        </div>
      </UPageCard>
    </div>

    <UPageCard title="Booking siap check-in" description="Daftar booking hari ini dari pasien yang bisa diproses frontdesk.">
      <div class="mb-4 flex justify-end"><UButton icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="bookingPending" @click="refreshBookingsToday">Muat ulang booking</UButton></div>
      <div class="table-responsive-wrapper overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="border-b border-default text-left text-muted">
            <tr>
              <th class="px-4 py-3 font-medium">Pasien</th>
              <th class="px-4 py-3 font-medium">Dokter</th>
              <th class="px-4 py-3 font-medium">Jam</th>
              <th class="px-4 py-3 font-medium">Status</th>
              <th class="px-4 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!bookingPending && bookingRows.length === 0" class="border-b border-default/60 last:border-b-0"><td colspan="5" class="px-4 py-8 text-center text-muted">Belum ada booking hari ini.</td></tr>
            <tr v-for="row in bookingRows" :key="row.id" class="border-b border-default/60 last:border-b-0">
              <td class="px-4 py-3"><p class="font-medium">{{ row.patient.fullName }}</p><p class="text-xs text-muted">{{ row.patient.phone }}</p></td>
              <td class="px-4 py-3">{{ row.doctor.fullName }}</td>
              <td class="px-4 py-3">{{ row.scheduleTime }}</td>
              <td class="px-4 py-3"><UBadge :color="row.checkIn?.queue ? 'success' : 'primary'" variant="subtle">{{ row.checkIn?.queue?.status || row.status }}</UBadge></td>
              <td class="px-4 py-3">
            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-up-right" @click="selectBooking(row)">Pilih</UButton>
              <UButton color="warning" variant="soft" icon="i-lucide-badge-check" :loading="loadingCheckIn && quickCheckInId === row.id" @click="runCheckIn(row.id, 'manual')">Check-in</UButton>
            </div>
          </td>
        </tr>
          </tbody>
        </table>
      </div>
    </UPageCard>

    <UPageCard title="Aktivitas check-in" description="Data antrean dan print job hari ini.">
      <div class="mb-4 flex justify-end"><UButton icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="queuePending || checkInPending || bookingPending" @click="refreshAll">Muat ulang</UButton></div>
      <div class="table-responsive-wrapper overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="border-b border-default text-left text-muted">
            <tr>
              <th class="px-4 py-3 font-medium">Pasien</th>
              <th class="px-4 py-3 font-medium">Nomor</th>
              <th class="px-4 py-3 font-medium">Metode</th>
              <th class="px-4 py-3 font-medium">Print</th>
              <th class="px-4 py-3 font-medium">Status</th>
              <th class="px-4 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!queuePending && rows.length === 0" class="border-b border-default/60 last:border-b-0"><td colspan="6" class="px-4 py-8 text-center text-muted">Belum ada antrean hari ini.</td></tr>
            <tr v-for="row in rows" :key="row.id" class="border-b border-default/60 last:border-b-0">
              <td class="px-4 py-3 font-medium">{{ row.checkIn?.booking?.patient?.fullName || '-' }}</td>
              <td class="px-4 py-3">{{ row.queueNumber }}</td>
              <td class="px-4 py-3">{{ row.checkIn?.checkInMethod || '-' }}</td>
              <td class="px-4 py-3 text-muted">{{ row.printJobs?.length || 0 }} job</td>
              <td class="px-4 py-3"><UBadge :color="row.status === 'completed' ? 'success' : row.status === 'called' ? 'warning' : 'primary'" variant="subtle">{{ row.status }}</UBadge></td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <UButton v-if="row.checkIn?.booking?.id" color="warning" variant="ghost" icon="i-lucide-rotate-cw" :loading="loadingCheckIn && quickCheckInId === row.checkIn.booking.id" @click="runCheckIn(row.checkIn.booking.id, row.checkIn?.checkInMethod === 'qr' ? 'qr' : 'manual')">Check-in ulang</UButton>
                  <UButton v-if="row.printJobs?.length" color="success" variant="ghost" icon="i-lucide-printer-check" :loading="reprintingId === row.printJobs[row.printJobs.length - 1].id" @click="reprintTicket(row.printJobs[row.printJobs.length - 1].id)">Reprint</UButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UPageCard>
  </div>
</template>

<style scoped>
.table-responsive-wrapper {
  overflow-x: auto;
}

.scan-actions-grid {
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

@media (max-width: 767px) {
  .table-responsive-wrapper table thead,
  .table-responsive-wrapper table tbody tr {
    display: block;
  }

  .table-responsive-wrapper table th,
  .table-responsive-wrapper table td {
    display: block;
    width: 100%;
    text-align: left;
    border-bottom: 1px solid rgb(226 232 240);
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .table-responsive-wrapper table thead {
    display: none;
  }

  .table-responsive-wrapper table tbody tr {
    margin-bottom: 1rem;
    border: 1px solid rgb(226 232 240);
    border-radius: 1rem;
    overflow: hidden;
  }

  .table-responsive-wrapper table tbody tr td:first-child {
    padding-top: 1.25rem;
  }

  .table-responsive-wrapper table tbody tr td:last-child {
    padding-bottom: 1.25rem;
    border-bottom: none;
  }

  .table-responsive-wrapper table tbody tr td .flex.justify-end {
    justify-content: flex-start;
    margin-top: 0.75rem;
  }
}
</style>
