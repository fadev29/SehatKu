<script setup lang="ts">
definePageMeta({ role: 'admin', layout: 'admin' })

type StaffRow = { id: string; name?: string | null; email: string; emailVerified: boolean; createdAt: string; image?: string | null }
const modalOpen = ref(false)
const editMode = ref<'create' | 'edit'>('create')
const activeId = ref('')
const saving = ref(false)
const deletingId = ref('')
const search = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const form = reactive({ name: '', email: '', password: 'password123' })
const { data, pending, error, refresh } = await useFetch('/api/admin/staff')
const rows = computed(() => (data.value?.data ?? []) as StaffRow[])
const filteredRows = computed(() => rows.value.filter((row) => `${row.name ?? ''} ${row.email}`.toLowerCase().includes(search.value.toLowerCase())))
function initials(name: string){ return name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase() }
function formatDate(value: string){ return new Date(value).toLocaleDateString('id-ID') }
function resetForm(){ Object.assign(form,{ name:'', email:'', password:'password123' }); activeId.value=''; editMode.value='create' }
function openCreate(){ errorMessage.value=''; successMessage.value=''; resetForm(); modalOpen.value=true }
function openEdit(row: StaffRow){ errorMessage.value=''; successMessage.value=''; editMode.value='edit'; activeId.value=row.id; Object.assign(form,{ name:row.name ?? '', email:row.email, password:'password123' }); modalOpen.value=true }
async function handleSubmit(){ errorMessage.value=''; successMessage.value=''; if(!form.name.trim()||!form.email.trim()){ errorMessage.value='Nama dan email wajib diisi'; return } saving.value=true; try { if(editMode.value==='edit'&&activeId.value){ await $fetch(`/api/admin/staff/${activeId.value}`, { method:'PATCH', body:{ name:form.name.trim(), email:form.email.trim(), password:form.password, role:'staff' } }); successMessage.value='Staff berhasil diperbarui' } else { await $fetch('/api/admin/staff', { method:'POST', body:{ name:form.name.trim(), email:form.email.trim(), password:form.password, role:'staff' } }); successMessage.value='Staff berhasil ditambahkan' } modalOpen.value=false; resetForm(); await refresh() } catch (error:any) { errorMessage.value=error?.data?.statusMessage || error?.message || 'Gagal menyimpan staff' } finally { saving.value=false } }
async function handleDelete(row: StaffRow){ errorMessage.value=''; successMessage.value=''; deletingId.value=row.id; try { await $fetch(`/api/admin/staff/${row.id}`, { method:'DELETE' }); successMessage.value=`Staff ${row.name || row.email} dihapus`; await refresh() } catch (error:any) { errorMessage.value=error?.data?.statusMessage || error?.message || 'Gagal menghapus staff' } finally { deletingId.value='' } }
</script>
<template><div class="admin-page"><div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><h1 class="text-4xl font-semibold tracking-tight">Data Staff</h1><p class="mt-2 text-lg text-muted">Akun staff login dari backend admin.</p></div><div class="flex gap-3"><UButton label="Muat Ulang" icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="pending" @click="refresh" /><UButton label="Tambah Staff" icon="i-lucide-plus" color="primary" @click="openCreate" /></div></div><UPageCard class="admin-table-card"><UInput v-model="search" icon="i-lucide-search" placeholder="Cari nama atau email staff..." /></UPageCard><UPageCard v-if="successMessage" class="admin-table-card border border-success/30"><p class="font-semibold text-success">{{ successMessage }}</p></UPageCard><UPageCard v-if="error || errorMessage" class="admin-table-card border border-error/30"><p class="font-semibold text-error">{{ errorMessage || 'Gagal memuat data staff.' }}</p></UPageCard><UPageCard class="admin-table-card"><div class="admin-mobile-table overflow-x-auto"><table class="min-w-full text-sm"><thead class="bg-elevated/50 text-left text-muted"><tr><th class="px-6 py-4 font-medium">Staff</th><th class="px-6 py-4 font-medium">Email</th><th class="px-6 py-4 font-medium">Verifikasi</th><th class="px-6 py-4 font-medium">Dibuat</th><th class="px-6 py-4 text-right font-medium">Aksi</th></tr></thead><tbody><tr v-if="!pending && filteredRows.length === 0" class="border-t border-default/70"><td colspan="5" class="px-6 py-8 text-center text-muted">Belum ada data staff.</td></tr><tr v-for="row in filteredRows" :key="row.id" class="border-t border-default/70"><td class="px-6 py-4"><div class="flex items-center gap-3"><UAvatar :src="row.image || undefined" :alt="initials(row.name || 'S')" size="sm" class="shrink-0" :ui="{ root: 'rounded-full overflow-hidden', image: 'object-cover' }" /><div class="min-w-0"><p class="font-semibold">{{ row.name || '-' }}</p><p class="font-mono text-xs text-muted break-all">{{ row.id }}</p></div></div></td><td class="px-6 py-4 break-all">{{ row.email }}</td><td class="px-6 py-4"><UBadge :color="row.emailVerified ? 'success' : 'warning'" variant="subtle">{{ row.emailVerified ? 'verified' : 'pending' }}</UBadge></td><td class="px-6 py-4">{{ formatDate(row.createdAt) }}</td><td class="px-6 py-4"><div class="flex justify-end gap-2"><UButton icon="i-lucide-pencil" color="neutral" variant="ghost" @click="openEdit(row)" /><UButton icon="i-lucide-trash-2" color="error" variant="ghost" :loading="deletingId === row.id" @click="handleDelete(row)" /></div></td></tr></tbody></table></div></UPageCard><UModal v-model:open="modalOpen" :title="editMode === 'edit' ? 'Edit Staff' : 'Tambah Staff'"><template #body><div class="space-y-4"><div v-if="errorMessage" class="rounded-2xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{{ errorMessage }}</div><div class="grid gap-4 md:grid-cols-2"><UFormField label="Nama" required><UInput v-model="form.name" /></UFormField><UFormField label="Email login" required><UInput v-model="form.email" type="email" /></UFormField><UFormField class="md:col-span-2" label="Password dummy"><UInput v-model="form.password" /></UFormField></div></div></template><template #footer><div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><UButton label="Batal" color="neutral" variant="ghost" @click="modalOpen = false" /><UButton :label="editMode === 'edit' ? 'Update' : 'Simpan'" icon="i-lucide-save" :loading="saving" @click="handleSubmit" /></div></template></UModal></div></template>

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
