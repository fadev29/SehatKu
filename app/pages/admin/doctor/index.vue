<script setup lang="ts">
definePageMeta({ role: 'admin', layout: 'admin' })

type DoctorRow = {
  id: string
  fullName: string
  specialization?: string | null
  clinicId: string
  serviceId: string
  isActive: boolean
  clinic?: { id: string; name: string }
  service?: { id: string; name: string }
  user?: { id: string; email: string; name?: string | null; image?: string | null }
}

const modalOpen = ref(false)
const editMode = ref<'create' | 'edit'>('create')
const activeId = ref('')
const saving = ref(false)
const deletingId = ref('')
const search = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const form = reactive({
  fullName: '',
  specialization: '',
  clinicId: '',
  serviceId: '',
  email: '',
  password: 'password123',
  isActive: true
})

const { data, pending, error, refresh } = await useFetch('/api/admin/doctors')
const { data: clinicsData } = await useFetch('/api/admin/clinics')
const { data: servicesData } = await useFetch('/api/admin/services')

const rows = computed(() => (data.value?.data ?? []) as DoctorRow[])
const clinicOptions = computed(() => ((clinicsData.value?.data ?? []) as any[]).map((item) => ({ label: item.name, value: item.id })))
const serviceOptions = computed(() => ((servicesData.value?.data ?? []) as any[]).filter((item) => !form.clinicId || item.clinicId === form.clinicId).map((item) => ({ label: item.name, value: item.id })))
const filteredRows = computed(() => rows.value.filter((row) => `${row.fullName} ${row.specialization ?? ''} ${row.clinic?.name ?? ''} ${row.user?.email ?? ''}`.toLowerCase().includes(search.value.toLowerCase())))

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function resetForm() {
  Object.assign(form, { fullName: '', specialization: '', clinicId: '', serviceId: '', email: '', password: 'password123', isActive: true })
  activeId.value = ''
  editMode.value = 'create'
}

function openCreate() {
  errorMessage.value = ''
  successMessage.value = ''
  resetForm()
  modalOpen.value = true
}

function openEdit(row: DoctorRow) {
  errorMessage.value = ''
  successMessage.value = ''
  editMode.value = 'edit'
  activeId.value = row.id
  Object.assign(form, {
    fullName: row.fullName,
    specialization: row.specialization ?? '',
    clinicId: row.clinicId,
    serviceId: row.serviceId,
    email: row.user?.email ?? '',
    password: 'password123',
    isActive: row.isActive
  })
  modalOpen.value = true
}

async function handleSubmit() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!form.fullName.trim() || !form.clinicId || !form.serviceId) {
    errorMessage.value = 'Nama, klinik, dan layanan wajib diisi'
    return
  }

  saving.value = true
  try {
    const payload = {
      fullName: form.fullName.trim(),
      specialization: form.specialization.trim() || undefined,
      clinicId: form.clinicId,
      serviceId: form.serviceId,
      email: form.email.trim() || undefined,
      password: form.password || undefined,
      isActive: form.isActive
    }

    if (editMode.value === 'edit' && activeId.value) {
      await $fetch(`/api/admin/doctors/${activeId.value}`, { method: 'PATCH', body: payload })
      successMessage.value = 'Dokter berhasil diperbarui'
    } else {
      await $fetch('/api/admin/doctors', { method: 'POST', body: payload })
      successMessage.value = 'Dokter dan akun login berhasil ditambahkan'
    }

    modalOpen.value = false
    resetForm()
    await refresh()
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.message || 'Gagal menyimpan dokter'
  } finally {
    saving.value = false
  }
}

async function handleDelete(row: DoctorRow) {
  errorMessage.value = ''
  successMessage.value = ''
  deletingId.value = row.id
  try {
    await $fetch(`/api/admin/doctors/${row.id}`, { method: 'DELETE' })
    successMessage.value = `Dokter ${row.fullName} dinonaktifkan`
    await refresh()
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.message || 'Gagal menghapus dokter'
  } finally {
    deletingId.value = ''
  }
}
</script>

<template>
  <div class="admin-page">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-4xl font-semibold tracking-tight">Data Dokter</h1>
        <p class="mt-2 text-lg text-muted">Master dokter dan akun login dokter dari backend admin.</p>
      </div>
      <div class="flex gap-3">
        <UButton label="Muat Ulang" icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="pending" @click="refresh" />
        <UButton label="Tambah Dokter" icon="i-lucide-plus" color="primary" @click="openCreate" />
      </div>
    </div>

    <UPageCard class="admin-table-card">
      <UInput v-model="search" icon="i-lucide-search" placeholder="Cari nama dokter, spesialisasi, klinik, atau email..." />
    </UPageCard>

    <UPageCard v-if="successMessage" class="admin-table-card border border-success/30">
      <p class="font-semibold text-success">{{ successMessage }}</p>
    </UPageCard>

    <UPageCard v-if="error || errorMessage" class="admin-table-card border border-error/30">
      <p class="font-semibold text-error">{{ errorMessage || 'Gagal memuat data dokter.' }}</p>
    </UPageCard>

    <UPageCard class="admin-table-card">
      <div class="admin-mobile-table overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-elevated/50 text-left text-muted">
            <tr>
              <th class="px-6 py-4 font-medium">Dokter</th>
              <th class="px-6 py-4 font-medium">Email Login</th>
              <th class="px-6 py-4 font-medium">Klinik</th>
              <th class="px-6 py-4 font-medium">Layanan</th>
              <th class="px-6 py-4 font-medium">Status</th>
              <th class="px-6 py-4 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!pending && filteredRows.length === 0" class="border-t border-default/70">
              <td colspan="6" class="px-6 py-8 text-center text-muted">Belum ada data dokter.</td>
            </tr>
            <tr v-for="row in filteredRows" :key="row.id" class="border-t border-default/70">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <UAvatar :src="row.user?.image || undefined" :alt="initials(row.fullName)" size="sm" class="shrink-0" :ui="{ root: 'rounded-full overflow-hidden', image: 'object-cover' }" />
                  <div class="min-w-0">
                    <p class="font-semibold">{{ row.fullName }}</p>
                    <p class="truncate text-xs text-muted">{{ row.specialization || '-' }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center justify-between gap-3">
                  <span class="break-all">{{ row.user?.email || '-' }}</span>
                  <UButton v-if="!row.user?.email" size="xs" color="primary" variant="soft" @click="openEdit(row)">Buat Akun</UButton>
                </div>
              </td>
              <td class="px-6 py-4">{{ row.clinic?.name || '-' }}</td>
              <td class="px-6 py-4">{{ row.service?.name || '-' }}</td>
              <td class="px-6 py-4"><UBadge :color="row.isActive ? 'success' : 'neutral'" variant="subtle">{{ row.isActive ? 'aktif' : 'nonaktif' }}</UBadge></td>
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

    <UModal v-model:open="modalOpen" :title="editMode === 'edit' ? 'Edit Dokter' : 'Tambah Dokter'">
      <template #body>
        <div class="space-y-4">
          <div v-if="errorMessage" class="rounded-2xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{{ errorMessage }}</div>
          <div class="grid gap-4 md:grid-cols-2">
            <UFormField label="Nama" required><UInput v-model="form.fullName" /></UFormField>
            <UFormField label="Spesialisasi"><UInput v-model="form.specialization" /></UFormField>
            <UFormField label="Klinik" required><USelectMenu v-model="form.clinicId" value-key="value" option-attribute="label" :items="clinicOptions" /></UFormField>
            <UFormField label="Layanan" required><USelectMenu v-model="form.serviceId" value-key="value" option-attribute="label" :items="serviceOptions" /></UFormField>
            <UFormField class="md:col-span-2" label="Email Login Dokter"><UInput v-model="form.email" type="email" placeholder="dokter.nama@sehatku.local" /></UFormField>
            <UFormField class="md:col-span-2" label="Password Dokter"><UInput v-model="form.password" type="text" /></UFormField>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <UButton label="Batal" color="neutral" variant="ghost" @click="modalOpen = false" />
          <UButton :label="editMode === 'edit' ? 'Update' : 'Simpan'" icon="i-lucide-save" :loading="saving" @click="handleSubmit" />
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
@media (max-width: 767px) {
  .admin-mobile-table table thead { display: none; }
  .admin-mobile-table table,
  .admin-mobile-table tbody,
  .admin-mobile-table tr,
  .admin-mobile-table td { display: block; width: 100%; }
  .admin-mobile-table tr { margin-bottom: 1rem; overflow: hidden; border: 1px solid rgb(226 232 240); border-radius: 1rem; background: white; }
  .admin-mobile-table td { padding: .875rem 1rem; border-bottom: 1px solid rgb(241 245 249); }
  .admin-mobile-table td:last-child { border-bottom: none; }
  .admin-mobile-table td .flex.justify-end { justify-content: stretch; flex-wrap: wrap; }
  .admin-mobile-table td .flex.justify-end > * { flex: 1 1 0%; }
}
</style>
