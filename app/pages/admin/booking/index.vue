<script setup lang="ts">
definePageMeta({ role: 'admin', layout: 'admin' })

type BookingRow = { id: string; status: string; scheduleDate: string; scheduleTime: string; patient: { fullName: string; phone: string }; doctor: { fullName: string } }
const selectedStatus = ref('Semua Status')
const selectedDate = ref('')
const modalOpen = ref(false)
const activeId = ref('')
const saving = ref(false)
const deletingId = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const form = reactive({ status: 'booked', scheduleDate: '', scheduleTime: '' })
const statusOptions = ['Semua Status', 'booked', 'checked_in', 'cancelled', 'expired']
const { data, pending, refresh } = await useFetch('/api/admin/bookings')
const rows = computed(() => (data.value?.data ?? []) as BookingRow[])
const filteredRows = computed(() => rows.value.filter((row) => (selectedStatus.value === 'Semua Status' || row.status === selectedStatus.value) && (!selectedDate.value || row.scheduleDate.startsWith(selectedDate.value))))
function formatDate(value: string){ return new Date(value).toLocaleDateString('id-ID') }
function getStatusColor(status: string){ if(status==='checked_in') return 'success'; if(status==='cancelled') return 'error'; if(status==='expired') return 'warning'; return 'primary' }
function openEdit(row: BookingRow){ errorMessage.value=''; successMessage.value=''; activeId.value=row.id; Object.assign(form,{ status:row.status, scheduleDate:row.scheduleDate.split('T')[0], scheduleTime:row.scheduleTime }); modalOpen.value=true }
async function handleSubmit(){ errorMessage.value=''; successMessage.value=''; if(!activeId.value){ errorMessage.value='Booking belum dipilih'; return } saving.value=true; try { await $fetch(`/api/admin/bookings/${activeId.value}`, { method:'PATCH', body:{ status:form.status, scheduleDate:form.scheduleDate, scheduleTime:form.scheduleTime } }); successMessage.value='Booking berhasil diperbarui'; modalOpen.value=false; await refresh() } catch (error:any) { errorMessage.value=error?.data?.statusMessage || error?.message || 'Gagal memperbarui booking' } finally { saving.value=false } }
async function handleDelete(row: BookingRow){ errorMessage.value=''; successMessage.value=''; deletingId.value=row.id; try { await $fetch(`/api/admin/bookings/${row.id}`, { method:'DELETE' }); successMessage.value='Booking dihapus'; await refresh() } catch (error:any) { errorMessage.value=error?.data?.statusMessage || error?.message || 'Gagal menghapus booking' } finally { deletingId.value='' } }
</script>
<template><div class="admin-page"><div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><h1 class="text-4xl font-semibold tracking-tight">Manajemen Booking</h1><p class="mt-2 max-w-2xl text-lg text-muted">Data booking langsung dari backend admin.</p></div><div class="flex flex-col gap-3 sm:flex-row"><USelectMenu v-model="selectedStatus" :items="statusOptions" class="sm:w-44" /><UInput v-model="selectedDate" type="date" class="sm:w-44" /><UButton label="Muat Ulang" icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="pending" @click="refresh" /></div></div><UPageCard v-if="successMessage" class="admin-table-card border border-success/30"><p class="font-semibold text-success">{{ successMessage }}</p></UPageCard><UPageCard v-if="errorMessage" class="admin-table-card border border-error/30"><p class="font-semibold text-error">{{ errorMessage }}</p></UPageCard><UPageCard class="admin-table-card"><div class="admin-mobile-table overflow-x-auto"><table class="min-w-full text-sm"><thead class="bg-elevated/50 text-left text-muted"><tr><th class="px-6 py-4 font-medium">Nama Pasien</th><th class="px-6 py-4 font-medium">Booking ID</th><th class="px-6 py-4 font-medium">Dokter</th><th class="px-6 py-4 font-medium">Waktu</th><th class="px-6 py-4 font-medium">Status</th><th class="px-6 py-4 text-right font-medium">Aksi</th></tr></thead><tbody><tr v-if="!pending && filteredRows.length === 0" class="border-t border-default/70"><td colspan="6" class="px-6 py-8 text-center text-muted">Belum ada data booking.</td></tr><tr v-for="row in filteredRows" :key="row.id" class="border-t border-default/70"><td class="px-6 py-4" data-label="Pasien"><p class="font-semibold">{{ row.patient.fullName }}</p><p class="text-xs text-muted">{{ row.patient.phone }}</p></td><td class="px-6 py-4 font-mono text-xs break-all" data-label="Booking ID">{{ row.id }}</td><td class="px-6 py-4" data-label="Dokter">{{ row.doctor.fullName }}</td><td class="px-6 py-4" data-label="Waktu">{{ formatDate(row.scheduleDate) }} • {{ row.scheduleTime }}</td><td class="px-6 py-4" data-label="Status"><UBadge :color="getStatusColor(row.status)" variant="subtle">{{ row.status }}</UBadge></td><td class="px-6 py-4" data-label="Aksi"><div class="flex justify-end gap-2"><UButton icon="i-lucide-pencil" color="neutral" variant="ghost" @click="openEdit(row)" /><UButton icon="i-lucide-trash-2" color="error" variant="ghost" :loading="deletingId === row.id" @click="handleDelete(row)" /></div></td></tr></tbody></table></div></UPageCard><UModal v-model:open="modalOpen" title="Edit Booking"><template #body><div class="space-y-4"><div v-if="errorMessage" class="rounded-2xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{{ errorMessage }}</div><div class="grid gap-4 md:grid-cols-2"><UFormField label="Tanggal"><UInput v-model="form.scheduleDate" type="date" /></UFormField><UFormField label="Jam"><UInput v-model="form.scheduleTime" type="time" /></UFormField><UFormField class="md:col-span-2" label="Status"><USelectMenu v-model="form.status" :items="statusOptions.slice(1)" /></UFormField></div></div></template><template #footer><div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><UButton label="Batal" color="neutral" variant="ghost" @click="modalOpen = false" /><UButton label="Update" icon="i-lucide-save" :loading="saving" @click="handleSubmit" /></div></template></UModal></div></template>
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
