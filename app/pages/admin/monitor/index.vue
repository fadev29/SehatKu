<script setup lang="ts">
definePageMeta({ role: 'admin', layout: 'admin' })

type PrinterRow = {
  id: string
  name: string
  serviceUuid: string
  characteristicUuid: string
  writeMode?: string | null
  isActive: boolean
}

const writeModeOptions = [
  { label: 'Standar', value: 'chunk' },
  { label: 'Bulk', value: 'bulk' }
]

type MonitorConfig = {
  title?: string
  queueLabel?: string
  showTicker?: boolean
}

const editMode = ref<'create' | 'edit'>('create')
const activeId = ref('')
const saving = ref(false)
const deletingId = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const form = reactive({
  name: '',
  serviceUuid: '',
  characteristicUuid: '',
  writeMode: 'chunk',
  isActive: true
})

const { data: printerData, pending: printerPending, error: printerError, refresh: refreshPrinters } = await useFetch('/api/admin/printer-profiles')
const { data: monitorConfigData, pending: configPending, refresh: refreshConfig } = await useFetch('/api/monitor/config')
const { data: monitorTickerData, pending: tickerPending, refresh: refreshTicker } = await useFetch('/api/monitor/ticker')

const printers = computed(() => (printerData.value?.data ?? []) as PrinterRow[])
const config = computed(() => (monitorConfigData.value?.data ?? {}) as MonitorConfig)
const tickerRows = computed(() => (monitorTickerData.value?.data ?? []) as string[])
const stats = computed(() => [
  { label: 'Printer profile', value: String(printers.value.length), icon: 'i-lucide-printer' },
  { label: 'Pesan ticker', value: String(tickerRows.value.length), icon: 'i-lucide-message-square-text' },
  { label: 'Ticker aktif', value: config.value.showTicker ? 'Ya' : 'Tidak', icon: 'i-lucide-monitor-play' }
])

function resetFeedback() {
  errorMessage.value = ''
  successMessage.value = ''
}

function resetForm() {
  Object.assign(form, {
    name: '',
    serviceUuid: '',
    characteristicUuid: '',
    writeMode: 'chunk',
    isActive: true
  })
  activeId.value = ''
  editMode.value = 'create'
}

function validateForm() {
  if (!form.name.trim()) return 'Nama printer wajib diisi'
  if (!form.serviceUuid.trim()) return 'Service UUID wajib diisi'
  if (!form.characteristicUuid.trim()) return 'Characteristic UUID wajib diisi'
  return ''
}

function openEdit(row: PrinterRow) {
  resetFeedback()
  editMode.value = 'edit'
  activeId.value = row.id
  Object.assign(form, {
    name: row.name,
    serviceUuid: row.serviceUuid,
    characteristicUuid: row.characteristicUuid,
    writeMode: row.writeMode ?? 'chunk',
    isActive: row.isActive
  })
}

async function refreshAll() {
  await Promise.all([refreshPrinters(), refreshConfig(), refreshTicker()])
}

async function handleSubmit() {
  resetFeedback()
  const validationError = validateForm()
  if (validationError) {
    errorMessage.value = validationError
    return
  }

  saving.value = true
  try {
    if (editMode.value === 'edit' && activeId.value) {
      await $fetch(`/api/admin/printer-profiles/${activeId.value}`, {
        method: 'PATCH',
        body: {
          name: form.name.trim(),
          serviceUuid: form.serviceUuid.trim(),
          characteristicUuid: form.characteristicUuid.trim(),
          writeMode: form.writeMode,
          isActive: form.isActive
        }
      })
      successMessage.value = 'Printer profile berhasil diperbarui'
    } else {
      await $fetch('/api/admin/printer-profiles', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          serviceUuid: form.serviceUuid.trim(),
          characteristicUuid: form.characteristicUuid.trim(),
          writeMode: form.writeMode,
          isActive: form.isActive
        }
      })
      successMessage.value = 'Printer profile berhasil ditambahkan'
    }

    resetForm()
    await refreshPrinters()
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.message || 'Gagal menyimpan printer profile'
  } finally {
    saving.value = false
  }
}

async function handleDelete(row: PrinterRow) {
  resetFeedback()
  deletingId.value = row.id
  try {
    await $fetch(`/api/admin/printer-profiles/${row.id}`, { method: 'DELETE' })
    successMessage.value = `Printer ${row.name} dinonaktifkan`
    await refreshPrinters()
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.message || 'Gagal menghapus printer profile'
  } finally {
    deletingId.value = ''
  }
}
</script>

<template>
  <div class="admin-page space-y-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-4xl font-semibold tracking-tight">Monitor & Printer</h1>
        <p class="mt-2 text-lg text-muted">Kelola printer profile dan lihat preview data monitor aktif.</p>
      </div>
      <div class="flex gap-3">
        <UButton label="Form Baru" icon="i-lucide-plus" color="neutral" variant="outline" @click="resetForm" />
        <UButton label="Muat Ulang" icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="printerPending || configPending || tickerPending" @click="refreshAll" />
      </div>
    </div>

    <UPageCard v-if="successMessage" class="admin-table-card border border-success/30">
      <p class="font-semibold text-success">{{ successMessage }}</p>
    </UPageCard>

    <UPageCard v-if="printerError || errorMessage" class="admin-table-card border border-error/30">
      <p class="font-semibold text-error">{{ errorMessage || 'Gagal memuat konfigurasi monitor atau printer.' }}</p>
    </UPageCard>

    <UPageGrid>
      <UPageCard v-for="item in stats" :key="item.label" :title="item.label" :description="item.value" :icon="item.icon" />
    </UPageGrid>

    <UPageCard class="admin-table-card">
      <template #header>
        <div>
          <h2 class="text-2xl font-semibold">Printer Profile</h2>
          <p class="mt-1 text-sm text-muted">Form create dan edit memakai pola yang sama dengan menu admin lain.</p>
        </div>
      </template>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <UFormField label="Nama" required>
          <UInput v-model="form.name" />
        </UFormField>
        <UFormField label="Service UUID" required>
          <UInput v-model="form.serviceUuid" />
        </UFormField>
        <UFormField label="Characteristic UUID" required>
          <UInput v-model="form.characteristicUuid" />
        </UFormField>
        <UFormField label="Mode kirim BLE">
          <USelectMenu v-model="form.writeMode" value-key="value" option-attribute="label" :items="writeModeOptions" />
        </UFormField>
      </div>

      <div class="mt-4 flex flex-wrap gap-3">
        <UButton :label="editMode === 'edit' ? 'Update' : 'Simpan'" icon="i-lucide-save" :loading="saving" @click="handleSubmit" />
      </div>
    </UPageCard>

    <UPageCard class="admin-table-card">
      <template #header>
        <div>
          <h2 class="text-2xl font-semibold">Konfigurasi Monitor</h2>
          <p class="mt-1 text-sm text-muted">Preview endpoint monitor untuk cek data yang tampil di layar.</p>
        </div>
      </template>

      <div class="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-3">
        <div class="rounded-2xl border border-default p-4">
          <p class="text-muted">Judul</p>
          <p class="mt-2 font-semibold">{{ config.title || '-' }}</p>
        </div>
        <div class="rounded-2xl border border-default p-4">
          <p class="text-muted">Label Antrean</p>
          <p class="mt-2 font-semibold">{{ config.queueLabel || '-' }}</p>
        </div>
        <div class="rounded-2xl border border-default p-4">
          <p class="text-muted">Ticker</p>
          <p class="mt-2 font-semibold">{{ config.showTicker ? 'Aktif' : 'Nonaktif' }}</p>
        </div>
      </div>

      <div class="mt-4 rounded-2xl border border-default p-4">
        <p class="text-sm text-muted">Pesan ticker</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <UBadge v-for="item in tickerRows" :key="item" color="primary" variant="subtle">{{ item }}</UBadge>
        </div>
      </div>
    </UPageCard>

    <UPageCard class="admin-table-card">
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="text-2xl font-semibold">Daftar Printer</h2>
          </div>
          <div class="flex gap-2">
            <UButton icon="i-lucide-file-spreadsheet" label="CSV" color="success" variant="soft" />
            <UButton icon="i-lucide-download" label="Seed" color="neutral" variant="soft" />
          </div>
        </div>
      </template>

      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-elevated/50 text-left text-muted">
            <tr>
              <th class="px-6 py-4 font-medium">Nama</th>
              <th class="px-6 py-4 font-medium">Service UUID</th>
              <th class="px-6 py-4 font-medium">Characteristic UUID</th>
              <th class="px-6 py-4 font-medium">Mode</th>
              <th class="px-6 py-4 font-medium">Status</th>
              <th class="px-6 py-4 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!printerPending && printers.length === 0" class="border-t border-default/70">
              <td colspan="6" class="px-6 py-8 text-center text-muted">Belum ada printer profile.</td>
            </tr>
            <tr v-for="row in printers" :key="row.id" class="border-t border-default/70">
              <td class="px-6 py-4 font-medium">{{ row.name }}</td>
              <td class="px-6 py-4 font-mono text-xs">{{ row.serviceUuid }}</td>
              <td class="px-6 py-4 font-mono text-xs">{{ row.characteristicUuid }}</td>
              <td class="px-6 py-4">{{ row.writeMode || '-' }}</td>
              <td class="px-6 py-4">
                <UBadge :color="row.isActive ? 'success' : 'error'" variant="subtle">{{ row.isActive ? 'Aktif' : 'Nonaktif' }}</UBadge>
              </td>
              <td class="px-6 py-4">
                <div class="flex justify-end gap-2">
                  <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" @click="openEdit(row)" />
                  <UButton icon="i-lucide-trash-2" color="error" variant="ghost" :loading="deletingId === row.id" @click="handleDelete(row)" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UPageCard>
  </div>
</template>
