<script setup lang="ts">
definePageMeta({ role: 'admin', layout: 'admin' })

type ClinicRow = {
  id: string
  name: string
  address?: string | null
  isActive: boolean
}

const modalOpen = ref(false)
const editMode = ref<'create' | 'edit'>('create')
const activeId = ref('')
const search = ref('')
const saving = ref(false)
const deletingId = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const form = reactive({ name: '', address: '', isActive: true })

const { data, pending, error, refresh } = await useFetch('/api/admin/clinics')
const rows = computed(() => (data.value?.data ?? []) as ClinicRow[])
const filteredRows = computed(() => rows.value.filter((row) => `${row.name} ${row.address ?? ''}`.toLowerCase().includes(search.value.toLowerCase())))

function resetFeedback() { errorMessage.value = ''; successMessage.value = '' }
function validateForm() { return form.name.trim() ? '' : 'Nama klinik wajib diisi' }
function resetForm() { Object.assign(form, { name: '', address: '', isActive: true }); activeId.value = ''; editMode.value = 'create' }
function openCreate() { resetFeedback(); resetForm(); modalOpen.value = true }
function openEdit(row: ClinicRow) { resetFeedback(); editMode.value = 'edit'; activeId.value = row.id; Object.assign(form, { name: row.name, address: row.address ?? '', isActive: row.isActive }); modalOpen.value = true }
function formatStatus(value: boolean){ return value ? 'Aktif' : 'Nonaktif' }

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function exportCsv() {
  const lines = [['id', 'nama', 'alamat', 'status'], ...filteredRows.value.map((row) => [row.id, row.name, row.address ?? '', row.isActive ? 'aktif' : 'nonaktif'])]
  downloadFile('admin-klinik.csv', lines.map((line) => line.map((cell) => String(cell ?? '')).join(',')).join('\n'), 'text/csv;charset=utf-8;')
}
function exportSeed() { downloadFile('admin-klinik.json', JSON.stringify(filteredRows.value, null, 2), 'application/json;charset=utf-8;') }

async function handleSubmit() {
  resetFeedback()
  const validationError = validateForm()
  if (validationError) return errorMessage.value = validationError
  saving.value = true
  try {
    if (editMode.value === 'edit' && activeId.value) {
      await $fetch(`/api/admin/clinics/${activeId.value}`, { method: 'PATCH', body: { name: form.name.trim(), address: form.address.trim() || undefined, isActive: form.isActive } })
      successMessage.value = 'Klinik berhasil diperbarui'
    } else {
      await $fetch('/api/admin/clinics', { method: 'POST', body: { name: form.name.trim(), address: form.address.trim() || undefined, isActive: form.isActive } })
      successMessage.value = 'Klinik berhasil ditambahkan'
    }
    modalOpen.value = false
    resetForm()
    await refresh()
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.message || 'Gagal menyimpan klinik'
  } finally { saving.value = false }
}

async function handleDelete(row: ClinicRow) {
  resetFeedback()
  deletingId.value = row.id
  try {
    await $fetch(`/api/admin/clinics/${row.id}`, { method: 'DELETE' })
    successMessage.value = `Klinik ${row.name} dinonaktifkan`
    await refresh()
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.message || 'Gagal menghapus klinik'
  } finally { deletingId.value = '' }
}
</script>

<template>
  <div class="admin-page">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div><h1 class="text-4xl font-semibold tracking-tight">Manajemen Klinik</h1><p class="mt-2 text-lg text-muted">Kelola data cabang klinik dari backend admin.</p></div>
      <div class="flex w-full flex-col gap-3 sm:flex-row lg:w-auto"><UInput v-model="search" icon="i-lucide-search" placeholder="Cari klinik..." class="lg:w-72" /><UButton label="Muat Ulang" icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="pending" @click="refresh" /><UButton label="Tambah Klinik" icon="i-lucide-plus" color="primary" @click="openCreate" /></div>
    </div>
    <UPageCard v-if="successMessage" class="admin-table-card border border-success/30"><p class="font-semibold text-success">{{ successMessage }}</p></UPageCard>
    <UPageCard v-if="error || errorMessage" class="admin-table-card border border-error/30"><p class="font-semibold text-error">{{ errorMessage || 'Gagal memuat data klinik.' }}</p></UPageCard>
    <UPageCard class="admin-table-card">
      <div class="admin-mobile-table overflow-x-auto"><table class="min-w-full text-sm"><thead class="bg-elevated/50 text-left text-muted"><tr><th class="px-6 py-4 font-medium">Nama Klinik</th><th class="px-6 py-4 font-medium">ID</th><th class="px-6 py-4 font-medium">Alamat</th><th class="px-6 py-4 font-medium">Status</th><th class="px-6 py-4 text-right font-medium">Aksi</th></tr></thead><tbody><tr v-if="!pending && filteredRows.length === 0" class="border-t border-default/70"><td colspan="5" class="px-6 py-8 text-center text-muted">Belum ada data klinik.</td></tr><tr v-for="row in filteredRows" :key="row.id" class="border-t border-default/70"><td class="px-6 py-5 font-semibold text-primary" data-label="Klinik">{{ row.name }}</td><td class="px-6 py-5 font-mono text-xs break-all" data-label="ID">{{ row.id }}</td><td class="px-6 py-5 text-muted break-words" data-label="Alamat">{{ row.address || '-' }}</td><td class="px-6 py-5" data-label="Status"><UBadge :color="row.isActive ? 'success' : 'neutral'" variant="subtle">{{ formatStatus(row.isActive) }}</UBadge></td><td class="px-6 py-5" data-label="Aksi"><div class="flex justify-end gap-2"><UButton icon="i-lucide-pencil" color="neutral" variant="ghost" @click="openEdit(row)" /><UButton icon="i-lucide-trash-2" color="error" variant="ghost" :loading="deletingId === row.id" @click="handleDelete(row)" /></div></td></tr></tbody></table></div>
      <div class="flex flex-col gap-3 border-t border-default px-6 py-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between"><span>Menampilkan {{ filteredRows.length }} dari {{ rows.length }} klinik</span><div class="flex gap-2"><UButton icon="i-lucide-download" label="CSV" color="neutral" variant="soft" @click="exportCsv" /><UButton icon="i-lucide-database" label="Seed" color="neutral" variant="soft" @click="exportSeed" /></div></div>
    </UPageCard>
    <UModal v-model:open="modalOpen" :title="editMode === 'edit' ? 'Edit Klinik' : 'Tambah Klinik'"><template #body><div class="space-y-4"><div v-if="errorMessage" class="rounded-2xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{{ errorMessage }}</div><div class="grid gap-4 md:grid-cols-2"><UFormField label="Nama klinik" required><UInput v-model="form.name" /></UFormField><UFormField label="Status"><USelectMenu v-model="form.isActive" :items="[{ label: 'Aktif', value: true }, { label: 'Nonaktif', value: false }]" value-key="value" option-attribute="label" /></UFormField><UFormField class="md:col-span-2" label="Alamat"><UTextarea v-model="form.address" :rows="4" /></UFormField></div></div></template><template #footer><div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><UButton label="Batal" color="neutral" variant="ghost" @click="modalOpen = false" /><UButton :label="editMode === 'edit' ? 'Update' : 'Simpan'" icon="i-lucide-save" :loading="saving" @click="handleSubmit" /></div></template></UModal>
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
  .admin-mobile-table td .flex.justify-end { justify-content:stretch; flex-wrap:wrap; }
  .admin-mobile-table td .flex.justify-end > * { flex:1 1 0%; }
}
</style>
