<script setup lang="ts">
import { useStaffPrinter } from '~~/app/composables/useStaffPrinter'

definePageMeta({ role: 'staff', layout: 'staff' })

type PrinterProfile = {
  id: string
  name: string
  serviceUuid: string
  characteristicUuid: string
  writeMode?: string | null
}

const error = ref('')
const { data: printerData } = await useFetch('/api/staff/printer-profiles')
const printerProfiles = computed(() => (printerData.value?.data ?? []) as PrinterProfile[])
const selectedProfileId = ref('')

const {
  isBluetoothSupported,
  isConnectingPrinter,
  printerConnectError,
  connectedDeviceName,
  connectedPrinterId,
  connectedPrinterName,
  ensurePrinterConnection,
  disconnectPrinter,
} = useStaffPrinter()

const selectedProfile = computed(() => printerProfiles.value.find((item) => item.id === selectedProfileId.value) ?? printerProfiles.value[0] ?? null)
const isConnected = computed(() => connectedPrinterId.value === selectedProfile.value?.id && Boolean(connectedDeviceName.value))

watch(printerProfiles, (rows) => {
  if (!selectedProfileId.value && rows.length) {
    selectedProfileId.value = rows[0].id
  }
}, { immediate: true })

async function requestBluetoothDevice() {
  error.value = ''

  if (!selectedProfile.value) {
    error.value = 'Printer profile belum ada'
    return
  }

  try {
    await ensurePrinterConnection(selectedProfile.value)
  } catch (cause: any) {
    error.value = cause?.message || printerConnectError.value || 'Gagal meminta perangkat bluetooth.'
  }
}

function disconnectDevice() {
  disconnectPrinter()
}
</script>

<template>
  <div class="space-y-6">
    <UPageCard title="Bluetooth Web API Supported" description="Sambungan di halaman ini dipakai ulang oleh panel staff saat print tiket.">
      <div class="flex flex-wrap items-center gap-3">
        <UButton icon="i-lucide-bluetooth-searching" :loading="isConnectingPrinter" @click="requestBluetoothDevice">
          Hubungkan Printer
        </UButton>
        <UButton v-if="isConnected" color="error" variant="subtle" icon="i-lucide-bluetooth-off" @click="disconnectDevice">
          Putuskan
        </UButton>
      </div>

      <div class="mt-4 grid gap-4 md:grid-cols-2">
        <UFormField label="Printer profile">
          <USelectMenu
            v-model="selectedProfileId"
            value-key="value"
            option-attribute="label"
            :items="printerProfiles.map((item) => ({ label: item.name, value: item.id }))"
          />
        </UFormField>

        <UFormField label="Status browser">
          <UInput :model-value="isBluetoothSupported ? 'Web Bluetooth Supported' : 'Web Bluetooth Not Supported'" disabled />
        </UFormField>
      </div>
    </UPageCard>

    <UPageCard :title="isConnected ? 'Connected' : 'Not Connected'" :ui="{ root: isConnected ? 'border-success' : 'border-error' }">
      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-3 text-sm">
          <div class="flex justify-between gap-4">
            <span class="text-muted">Connection</span>
            <UBadge :color="isConnected ? 'success' : 'error'" variant="subtle">
              {{ isConnected ? 'Connected' : 'Disconnected' }}
            </UBadge>
          </div>
          <div class="flex justify-between gap-4">
            <span class="text-muted">Device Name</span>
            <span class="font-medium">{{ connectedDeviceName || '-' }}</span>
          </div>
          <div class="flex justify-between gap-4">
            <span class="text-muted">Profile aktif</span>
            <span class="font-medium">{{ connectedPrinterName || '-' }}</span>
          </div>
        </div>

        <div v-if="selectedProfile" class="space-y-3 text-sm">
          <div class="flex justify-between gap-4">
            <span class="text-muted">Service UUID</span>
            <span class="font-medium text-xs">{{ selectedProfile.serviceUuid }}</span>
          </div>
          <div class="flex justify-between gap-4">
            <span class="text-muted">Characteristic UUID</span>
            <span class="font-medium text-xs">{{ selectedProfile.characteristicUuid }}</span>
          </div>
          <div class="flex justify-between gap-4">
            <span class="text-muted">Write mode</span>
            <span class="font-medium">{{ selectedProfile.writeMode || 'chunk' }}</span>
          </div>
        </div>
      </div>

      <UAlert
        v-if="error || printerConnectError"
        class="mt-4"
        color="error"
        variant="subtle"
        title="Bluetooth Error"
        :description="error || printerConnectError"
      />
    </UPageCard>
  </div>
</template>
