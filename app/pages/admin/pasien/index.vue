<script setup lang="ts">
definePageMeta({ role: 'admin', layout: 'admin' })

type PatientApiRow = { id: string; fullName: string; phone: string; user?: { email?: string | null; createdAt?: string; image?: string | null } }
const search = ref('')
const modalOpen = ref(false)
const editMode = ref<'create' | 'edit'>('create')
const activeId = ref('')
const saving = ref(false)
const deletingId = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const form = reactive({ fullName: '', phone: '', email: '', password: 'password123' })
const { data, pending, refresh } = await useFetch('/api/admin/patients')
const rows = computed(() => (data.value?.data ?? []) as PatientApiRow[])
const filteredRows = computed(() => rows.value.filter((row) => `${row.fullName} ${row.phone} ${row.user?.email ?? ''}`.toLowerCase().includes(search.value.toLowerCase())))
function initials(name: string){ return name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase() }
function formatDate(value?: string){ return value ? new Date(value).toLocaleDateString('id-ID') : '-' }
function resetForm(){ Object.assign(form,{ fullName:'', phone:'', email:'', password:'password123' }); activeId.value=''; editMode.value='create' }
function openCreate(){ errorMessage.value=''; successMessage.value=''; resetForm(); modalOpen.value=true }
function openEdit(row: PatientApiRow){ errorMessage.value=''; successMessage.value=''; editMode.value='edit'; activeId.value=row.id; Object.assign(form,{ fullName:row.fullName, phone:row.phone, email:row.user?.email ?? '', password:'password123' }); modalOpen.value=true }
async function handleSubmit(){ errorMessage.value=''; successMessage.value=''; if(!form.fullName.trim()||!form.phone.trim()){ errorMessage.value='Nama dan telepon wajib diisi'; return } saving.value=true; try { if(editMode.value==='edit'&&activeId.value){ await $fetch(`/api/admin/patients/${activeId.value}`, { method:'PATCH', body:{ fullName:form.fullName.trim(), phone:form.phone.trim(), email:form.email.trim() || undefined, password:form.password || undefined } }); successMessage.value='Pasien berhasil diperbarui' } else { await $fetch('/api/admin/patients', { method:'POST', body:{ fullName:form.fullName.trim(), phone:form.phone.trim(), email:form.email.trim() || undefined, password:form.password || undefined } }); successMessage.value='Pasien berhasil ditambahkan' } modalOpen.value=false; resetForm(); await refresh() } catch (error:any) { errorMessage.value=error?.data?.statusMessage || error?.message || 'Gagal menyimpan pasien' } finally { saving.value=false } }
async function handleDelete(row: PatientApiRow){ errorMessage.value=''; successMessage.value=''; deletingId.value=row.id; try { await $fetch(`/api/admin/patients/${row.id}`, { method:'DELETE' }); successMessage.value=`Pasien ${row.fullName} dihapus`; await refresh() } catch (error:any) { errorMessage.value=error?.data?.statusMessage || error?.message || 'Gagal menghapus pasien' } finally { deletingId.value='' } }
</script>
<template><div class="admin-page"><div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><h1 class="text-4xl font-semibold tracking-tight">Data Pasien</h1><p class="mt-2 text-lg text-muted">Kelola pasien dari data backend yang sama dengan panel lain.</p></div><div class="flex gap-3"><UButton label="Muat Ulang" icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="pending" @click="refresh" /><UButton label="Tambah Pasien" icon="i-lucide-plus" color="primary" @click="openCreate" /></div></div><UPageCard class="admin-table-card"><UInput v-model="search" icon="i-lucide-search" placeholder="Cari nama, telepon, atau email..." /></UPageCard><UPageCard v-if="successMessage" class="admin-table-card border border-success/30"><p class="font-semibold text-success">{{ successMessage }}</p></UPageCard><UPageCard v-if="errorMessage" class="admin-table-card border border-error/30"><p class="font-semibold text-error">{{ errorMessage }}</p></UPageCard><UPageCard class="admin-table-card"><div class="admin-mobile-table overflow-x-auto"><table class="min-w-full text-sm"><thead class="bg-elevated/50 text-left text-muted"><tr><th class="px-6 py-4 font-medium">Nama Pasien</th><th class="px-6 py-4 font-medium">ID</th><th class="px-6 py-4 font-medium">Kontak</th><th class="px-6 py-4 font-medium">Terdaftar</th><th class="px-6 py-4 text-right font-medium">Aksi</th></tr></thead><tbody><tr v-if="!pending && filteredRows.length === 0" class="border-t border-default/70"><td colspan="5" class="px-6 py-8 text-center text-muted">Belum ada data pasien.</td></tr><tr v-for="row in filteredRows" :key="row.id" class="border-t border-default/70"><td class="px-6 py-4"><div class="flex items-center gap-3"><UAvatar :src="row.user?.image || undefined" :alt="initials(row.fullName)" size="sm" class="shrink-0" :ui="{ root: 'rounded-full overflow-hidden', image: 'object-cover' }" /><div class="min-w-0"><p class="font-semibold">{{ row.fullName }}</p><p class="truncate text-xs text-muted">{{ row.user?.email || 'Tanpa email' }}</p></div></div></td><td class="px-6 py-4 font-mono text-xs break-all">{{ row.id }}</td><td class="px-6 py-4 break-all">{{ row.phone }}</td><td class="px-6 py-4">{{ formatDate(row.user?.createdAt) }}</td><td class="px-6 py-4"><div class="flex justify-end gap-2"><UButton icon="i-lucide-pencil" color="neutral" variant="ghost" @click="openEdit(row)" /><UButton icon="i-lucide-trash-2" color="error" variant="ghost" :loading="deletingId === row.id" @click="handleDelete(row)" /></div></td></tr></tbody></table></div></UPageCard><UModal v-model:open="modalOpen" :title="editMode === 'edit' ? 'Edit Pasien' : 'Tambah Pasien'"><template #body><div class="space-y-4"><div v-if="errorMessage" class="rounded-2xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{{ errorMessage }}</div><div class="grid gap-4 md:grid-cols-2"><UFormField label="Nama" required><UInput v-model="form.fullName" /></UFormField><UFormField label="Telepon" required><UInput v-model="form.phone" /></UFormField><UFormField class="md:col-span-2" label="Email"><UInput v-model="form.email" type="email" /></UFormField><UFormField class="md:col-span-2" label="Password dummy"><UInput v-model="form.password" /></UFormField></div></div></template><template #footer><div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><UButton label="Batal" color="neutral" variant="ghost" @click="modalOpen = false" /><UButton :label="editMode === 'edit' ? 'Update' : 'Simpan'" icon="i-lucide-save" :loading="saving" @click="handleSubmit" /></div></template></UModal></div></template>

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
