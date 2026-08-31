<script setup lang="ts">
import { toClinicSlug } from '~~/shared/utils/clinic-slug'

definePageMeta({ role: 'admin', layout: 'admin' })

type PrinterRow = {
  id: string
  name: string
  serviceUuid: string
  characteristicUuid: string
  writeMode?: string | null
  isActive: boolean
}

type ClinicRow = {
  id: string
  name: string
  isActive: boolean
}

type MonitorUserRow = {
  id: string
  name?: string | null
  email: string
  monitorClinicId?: string | null
  monitorClinic?: {
    id: string
    name: string
  } | null
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

const monitorModalOpen = ref(false)
const monitorEditMode = ref<'create' | 'edit'>('create')
const activeMonitorUserId = ref('')
const savingMonitorUser = ref(false)
const deletingMonitorUserId = ref('')
const monitorUserForm = reactive({
  name: '',
  email: '',
  password: '',
  clinicId: ''
})

const { data: printerData, pending: printerPending, error: printerError, refresh: refreshPrinters } = await useFetch('/api/admin/printer-profiles')
const { data: monitorConfigData, pending: configPending, refresh: refreshConfig } = await useFetch('/api/monitor/config')
const { data: monitorTickerData, pending: tickerPending, refresh: refreshTicker } = await useFetch('/api/monitor/ticker')
const { data: clinicsData, pending: clinicsPending, refresh: refreshClinics } = await useFetch('/api/admin/clinics')
const { data: monitorUsersData, pending: monitorUsersPending, refresh: refreshMonitorUsers } = await useFetch('/api/admin/monitor-users')

const printers = computed(() => (printerData.value?.data ?? []) as PrinterRow[])
const clinics = computed(() => (clinicsData.value?.data ?? []) as ClinicRow[])
const monitorUsers = computed(() => (monitorUsersData.value?.data ?? []) as MonitorUserRow[])
const config = computed(() => (monitorConfigData.value?.data ?? {}) as MonitorConfig)
const tickerRows = computed(() => (monitorTickerData.value?.data ?? []) as string[])
const clinicOptions = computed(() => clinics.value.filter(clinic => clinic.isActive).map(clinic => ({
  label: clinic.name,
  value: clinic.id
})))
const monitorLinks = computed(() => clinics.value.map(clinic => ({
  id: clinic.id,
  name: clinic.name,
  isActive: clinic.isActive,
  slug: toClinicSlug(clinic.name),
  path: `/monitor/${toClinicSlug(clinic.name)}`
})))
const stats = computed(() => [
  { label: 'Printer profile', value: String(printers.value.length), icon: 'i-lucide-printer' },
  { label: 'Akun monitor', value: String(monitorUsers.value.length), icon: 'i-lucide-users' },
  { label: 'URL monitor', value: String(monitorLinks.value.length), icon: 'i-lucide-link' },
  { label: 'Ticker aktif', value: config.value.showTicker ? 'Ya' : 'Tidak', icon: 'i-lucide-monitor-play' }
])

function getErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object') return fallback
  if ('data' in error && error.data && typeof error.data === 'object' && 'statusMessage' in error.data && typeof error.data.statusMessage === 'string') {
    return error.data.statusMessage
  }
  if ('message' in error && typeof error.message === 'string') {
    return error.message
  }
  return fallback
}

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

function resetMonitorUserForm() {
  Object.assign(monitorUserForm, {
    name: '',
    email: '',
    password: '',
    clinicId: clinicOptions.value[0]?.value || ''
  })
  activeMonitorUserId.value = ''
  monitorEditMode.value = 'create'
}

function validateForm() {
  if (!form.name.trim()) return 'Nama printer wajib diisi'
  if (!form.serviceUuid.trim()) return 'Service UUID wajib diisi'
  if (!form.characteristicUuid.trim()) return 'Characteristic UUID wajib diisi'
  return ''
}

function validateMonitorUserForm() {
  if (!monitorUserForm.name.trim()) return 'Nama akun monitor wajib diisi'
  if (!monitorUserForm.email.trim()) return 'Email akun monitor wajib diisi'
  if (!monitorUserForm.clinicId) return 'Cabang klinik wajib dipilih'
  if (monitorEditMode.value === 'create' && !monitorUserForm.password.trim()) return 'Password wajib diisi'
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

function openCreateMonitorUser() {
  resetFeedback()
  resetMonitorUserForm()
  monitorModalOpen.value = true
}

function openEditMonitorUser(row: MonitorUserRow) {
  resetFeedback()
  monitorEditMode.value = 'edit'
  activeMonitorUserId.value = row.id
  Object.assign(monitorUserForm, {
    name: row.name ?? '',
    email: row.email,
    password: '',
    clinicId: row.monitorClinicId ?? ''
  })
  monitorModalOpen.value = true
}

async function refreshAll() {
  await Promise.all([refreshPrinters(), refreshConfig(), refreshTicker(), refreshClinics(), refreshMonitorUsers()])
}

async function copyMonitorLink(path: string) {
  if (!import.meta.client || !navigator.clipboard) return
  await navigator.clipboard.writeText(`${window.location.origin}${path}`)
  successMessage.value = `URL monitor ${path} berhasil disalin`
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
  } catch (error: unknown) {
    errorMessage.value = getErrorMessage(error, 'Gagal menyimpan printer profile')
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
  } catch (error: unknown) {
    errorMessage.value = getErrorMessage(error, 'Gagal menghapus printer profile')
  } finally {
    deletingId.value = ''
  }
}

async function handleSubmitMonitorUser() {
  resetFeedback()
  const validationError = validateMonitorUserForm()
  if (validationError) {
    errorMessage.value = validationError
    return
  }

  savingMonitorUser.value = true
  try {
    const body = {
      name: monitorUserForm.name.trim(),
      email: monitorUserForm.email.trim(),
      clinicId: monitorUserForm.clinicId,
      ...(monitorUserForm.password.trim() ? { password: monitorUserForm.password.trim() } : {})
    }

    if (monitorEditMode.value === 'edit' && activeMonitorUserId.value) {
      await $fetch(`/api/admin/monitor-users/${activeMonitorUserId.value}`, {
        method: 'PATCH',
        body
      })
      successMessage.value = 'Akun monitor berhasil diperbarui'
    } else {
      await $fetch('/api/admin/monitor-users', {
        method: 'POST',
        body
      })
      successMessage.value = 'Akun monitor berhasil ditambahkan'
    }

    monitorModalOpen.value = false
    resetMonitorUserForm()
    await refreshMonitorUsers()
  } catch (error: unknown) {
    errorMessage.value = getErrorMessage(error, 'Gagal menyimpan akun monitor')
  } finally {
    savingMonitorUser.value = false
  }
}

async function handleDeleteMonitorUser(row: MonitorUserRow) {
  resetFeedback()
  deletingMonitorUserId.value = row.id
  try {
    await $fetch(`/api/admin/monitor-users/${row.id}`, { method: 'DELETE' })
    successMessage.value = `Akun monitor ${row.email} dihapus`
    await refreshMonitorUsers()
  } catch (error: unknown) {
    errorMessage.value = getErrorMessage(error, 'Gagal menghapus akun monitor')
  } finally {
    deletingMonitorUserId.value = ''
  }
}
</script>

<template>
  <div class="admin-page space-y-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-4xl font-semibold tracking-tight">
          Monitor & Printer
        </h1>
        <p class="mt-2 text-lg text-muted">
          Kelola printer profile, link monitor, dan akun monitor per cabang.
        </p>
      </div>
      <div class="flex gap-3">
        <UButton
          label="Akun Monitor"
          icon="i-lucide-user-plus"
          color="primary"
          variant="soft"
          @click="openCreateMonitorUser"
        />
        <UButton
          label="Form Baru"
          icon="i-lucide-plus"
          color="neutral"
          variant="outline"
          @click="resetForm"
        />
        <UButton
          label="Muat Ulang"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="printerPending || configPending || tickerPending || clinicsPending || monitorUsersPending"
          @click="refreshAll"
        />
      </div>
    </div>

    <UPageCard
      v-if="successMessage"
      class="admin-table-card border border-success/30"
    >
      <p class="font-semibold text-success">
        {{ successMessage }}
      </p>
    </UPageCard>
    <UPageCard
      v-if="printerError || errorMessage"
      class="admin-table-card border border-error/30"
    >
      <p class="font-semibold text-error">
        {{ errorMessage || 'Gagal memuat konfigurasi monitor atau printer.' }}
      </p>
    </UPageCard>

    <UPageGrid>
      <UPageCard
        v-for="item in stats"
        :key="item.label"
        :title="item.label"
        :description="item.value"
        :icon="item.icon"
      />
    </UPageGrid>

    <UPageCard class="admin-table-card">
      <template #header>
        <div>
          <h2 class="text-2xl font-semibold">
            Akun Monitor Cabang
          </h2><p class="mt-1 text-sm text-muted">
            Tiap akun monitor dikunci ke satu cabang klinik.
          </p>
        </div>
      </template>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-elevated/50 text-left text-muted">
            <tr>
              <th class="px-6 py-4 font-medium">
                Nama
              </th><th class="px-6 py-4 font-medium">
                Email
              </th><th class="px-6 py-4 font-medium">
                Klinik
              </th><th class="px-6 py-4 font-medium">
                URL
              </th><th class="px-6 py-4 text-right font-medium">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-if="!monitorUsersPending && monitorUsers.length === 0"
              class="border-t border-default/70"
            >
              <td
                colspan="5"
                class="px-6 py-8 text-center text-muted"
              >
                Belum ada akun monitor.
              </td>
            </tr>
            <tr
              v-for="row in monitorUsers"
              :key="row.id"
              class="border-t border-default/70"
            >
              <td class="px-6 py-4 font-medium">
                {{ row.name || '-' }}
              </td>
              <td class="px-6 py-4">
                {{ row.email }}
              </td>
              <td class="px-6 py-4">
                {{ row.monitorClinic?.name || '-' }}
              </td>
              <td class="px-6 py-4 font-mono text-xs">
                {{ row.monitorClinic?.name ? `/monitor/${toClinicSlug(row.monitorClinic.name)}` : '-' }}
              </td>
              <td class="px-6 py-4">
                <div class="flex justify-end gap-2">
                  <UButton
                    icon="i-lucide-pencil"
                    color="neutral"
                    variant="ghost"
                    @click="openEditMonitorUser(row)"
                  /><UButton
                    icon="i-lucide-copy"
                    color="primary"
                    variant="ghost"
                    :disabled="!row.monitorClinic?.name"
                    @click="row.monitorClinic?.name ? copyMonitorLink(`/monitor/${toClinicSlug(row.monitorClinic.name)}`) : null"
                  /><UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    :loading="deletingMonitorUserId === row.id"
                    @click="handleDeleteMonitorUser(row)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UPageCard>

    <UPageCard class="admin-table-card">
      <template #header>
        <div>
          <h2 class="text-2xl font-semibold">
            URL Monitor Cabang
          </h2><p class="mt-1 text-sm text-muted">
            Slug otomatis dari nama klinik. TV cabang bisa buka URL ini langsung.
          </p>
        </div>
      </template>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-elevated/50 text-left text-muted">
            <tr>
              <th class="px-6 py-4 font-medium">
                Klinik
              </th><th class="px-6 py-4 font-medium">
                Slug
              </th><th class="px-6 py-4 font-medium">
                URL
              </th><th class="px-6 py-4 font-medium">
                Status
              </th><th class="px-6 py-4 text-right font-medium">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-if="!clinicsPending && monitorLinks.length === 0"
              class="border-t border-default/70"
            >
              <td
                colspan="5"
                class="px-6 py-8 text-center text-muted"
              >
                Belum ada klinik.
              </td>
            </tr>
            <tr
              v-for="row in monitorLinks"
              :key="row.id"
              class="border-t border-default/70"
            >
              <td class="px-6 py-4 font-medium">
                {{ row.name }}
              </td>
              <td class="px-6 py-4 font-mono text-xs">
                {{ row.slug || '-' }}
              </td>
              <td class="px-6 py-4 font-mono text-xs">
                {{ row.path }}
              </td>
              <td class="px-6 py-4">
                <UBadge
                  :color="row.isActive ? 'success' : 'error'"
                  variant="subtle"
                >
                  {{ row.isActive ? 'Aktif' : 'Nonaktif' }}
                </UBadge>
              </td>
              <td class="px-6 py-4">
                <div class="flex justify-end gap-2">
                  <UButton
                    icon="i-lucide-external-link"
                    color="primary"
                    variant="ghost"
                    :to="row.path"
                    target="_blank"
                  /><UButton
                    icon="i-lucide-copy"
                    color="neutral"
                    variant="ghost"
                    @click="copyMonitorLink(row.path)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UPageCard>

    <UPageCard class="admin-table-card">
      <template #header>
        <div>
          <h2 class="text-2xl font-semibold">
            Printer Profile
          </h2><p class="mt-1 text-sm text-muted">
            Form create dan edit memakai pola yang sama dengan menu admin lain.
          </p>
        </div>
      </template>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <UFormField
          label="Nama"
          required
        >
          <UInput v-model="form.name" />
        </UFormField>
        <UFormField
          label="Service UUID"
          required
        >
          <UInput v-model="form.serviceUuid" />
        </UFormField>
        <UFormField
          label="Characteristic UUID"
          required
        >
          <UInput v-model="form.characteristicUuid" />
        </UFormField>
        <UFormField label="Mode kirim BLE">
          <USelectMenu
            v-model="form.writeMode"
            value-key="value"
            option-attribute="label"
            :items="writeModeOptions"
          />
        </UFormField>
      </div>
      <div class="mt-4 flex flex-wrap gap-3">
        <UButton
          :label="editMode === 'edit' ? 'Update' : 'Simpan'"
          icon="i-lucide-save"
          :loading="saving"
          @click="handleSubmit"
        />
      </div>
    </UPageCard>

    <UPageCard class="admin-table-card">
      <template #header>
        <div>
          <h2 class="text-2xl font-semibold">
            Konfigurasi Monitor
          </h2><p class="mt-1 text-sm text-muted">
            Preview endpoint monitor untuk cek data yang tampil di layar.
          </p>
        </div>
      </template>
      <div class="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-3">
        <div class="rounded-2xl border border-default p-4">
          <p class="text-muted">
            Judul
          </p><p class="mt-2 font-semibold">
            {{ config.title || '-' }}
          </p>
        </div>
        <div class="rounded-2xl border border-default p-4">
          <p class="text-muted">
            Label Antrean
          </p><p class="mt-2 font-semibold">
            {{ config.queueLabel || '-' }}
          </p>
        </div>
        <div class="rounded-2xl border border-default p-4">
          <p class="text-muted">
            Ticker
          </p><p class="mt-2 font-semibold">
            {{ config.showTicker ? 'Aktif' : 'Nonaktif' }}
          </p>
        </div>
      </div>
      <div class="mt-4 rounded-2xl border border-default p-4">
        <p class="text-sm text-muted">
          Pesan ticker
        </p><div class="mt-3 flex flex-wrap gap-2">
          <UBadge
            v-for="item in tickerRows"
            :key="item"
            color="primary"
            variant="subtle"
          >
            {{ item }}
          </UBadge>
        </div>
      </div>
    </UPageCard>

    <UPageCard class="admin-table-card">
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="text-2xl font-semibold">
              Daftar Printer
            </h2>
          </div><div class="flex gap-2">
            <UButton
              icon="i-lucide-file-spreadsheet"
              label="CSV"
              color="success"
              variant="soft"
            /><UButton
              icon="i-lucide-download"
              label="Seed"
              color="neutral"
              variant="soft"
            />
          </div>
        </div>
      </template>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-elevated/50 text-left text-muted">
            <tr>
              <th class="px-6 py-4 font-medium">
                Nama
              </th><th class="px-6 py-4 font-medium">
                Service UUID
              </th><th class="px-6 py-4 font-medium">
                Characteristic UUID
              </th><th class="px-6 py-4 font-medium">
                Mode
              </th><th class="px-6 py-4 font-medium">
                Status
              </th><th class="px-6 py-4 text-right font-medium">
                Aksi
              </th>
            </tr>
          </thead><tbody>
            <tr
              v-if="!printerPending && printers.length === 0"
              class="border-t border-default/70"
            >
              <td
                colspan="6"
                class="px-6 py-8 text-center text-muted"
              >
                Belum ada printer profile.
              </td>
            </tr><tr
              v-for="row in printers"
              :key="row.id"
              class="border-t border-default/70"
            >
              <td class="px-6 py-4 font-medium">
                {{ row.name }}
              </td><td class="px-6 py-4 font-mono text-xs">
                {{ row.serviceUuid }}
              </td><td class="px-6 py-4 font-mono text-xs">
                {{ row.characteristicUuid }}
              </td><td class="px-6 py-4">
                {{ row.writeMode || '-' }}
              </td><td class="px-6 py-4">
                <UBadge
                  :color="row.isActive ? 'success' : 'error'"
                  variant="subtle"
                >
                  {{ row.isActive ? 'Aktif' : 'Nonaktif' }}
                </UBadge>
              </td><td class="px-6 py-4">
                <div class="flex justify-end gap-2">
                  <UButton
                    icon="i-lucide-pencil"
                    color="neutral"
                    variant="ghost"
                    @click="openEdit(row)"
                  /><UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    :loading="deletingId === row.id"
                    @click="handleDelete(row)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UPageCard>

    <UModal
      v-model:open="monitorModalOpen"
      :title="monitorEditMode === 'edit' ? 'Edit Akun Monitor' : 'Tambah Akun Monitor'"
    >
      <template #body>
        <div class="space-y-4">
          <UFormField
            label="Nama akun"
            required
          >
            <UInput v-model="monitorUserForm.name" />
          </UFormField>
          <UFormField
            label="Email"
            required
          >
            <UInput
              v-model="monitorUserForm.email"
              type="email"
            />
          </UFormField>
          <UFormField
            label="Password"
            :required="monitorEditMode === 'create'"
          >
            <UInput
              v-model="monitorUserForm.password"
              type="password"
              :placeholder="monitorEditMode === 'edit' ? 'Kosongkan jika tidak diubah' : 'Minimal 8 karakter'"
            />
          </UFormField>
          <UFormField
            label="Cabang klinik"
            required
          >
            <USelectMenu
              v-model="monitorUserForm.clinicId"
              value-key="value"
              option-attribute="label"
              :items="clinicOptions"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <UButton
            label="Batal"
            color="neutral"
            variant="ghost"
            @click="monitorModalOpen = false"
          /><UButton
            :label="monitorEditMode === 'edit' ? 'Update' : 'Simpan'"
            icon="i-lucide-save"
            :loading="savingMonitorUser"
            @click="handleSubmitMonitorUser"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
