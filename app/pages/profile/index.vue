<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

type Booking = {
  id: string
  status: string
  scheduleDate: string
  scheduleTime: string
  createdAt: string
  doctor?: { fullName?: string | null; specialization?: string | null } | null
}

type PatientProfile = {
  id: string
  fullName: string
  phone: string
  createdAt: string
  user?: {
    id: string
    name?: string | null
    email?: string | null
    role?: string | null
    createdAt: string
    image?: string | null
  } | null
  bookings?: Booking[]
}

type ApiItem<T> = { data?: T }

const toast = useToast()
const { data, pending, error, refresh } = await useFetch<ApiItem<PatientProfile>>('/api/patient/me')
const profile = computed(() => data.value?.data ?? null)
const bookings = computed(() => profile.value?.bookings ?? [])
const recentActivities = computed(() => bookings.value.slice(0, 6).map((item) => ({
  waktu: new Date(item.createdAt).toLocaleString('id-ID'),
  aksi: `Booking dengan ${item.doctor?.fullName || 'dokter'}`,
  status: item.status,
})))

const summaryCards = computed(() => [
  { label: 'Total booking', value: String(bookings.value.length), icon: 'i-lucide-clipboard-list' },
  { label: 'Booking aktif', value: String(bookings.value.filter((item) => ['booked', 'checked_in', 'called'].includes(item.status)).length), icon: 'i-lucide-calendar-check-2' },
  { label: 'Selesai / batal', value: String(bookings.value.filter((item) => ['finished', 'cancelled'].includes(item.status)).length), icon: 'i-lucide-badge-check' },
])

const profileForm = reactive({ fullName: '', phone: '' })
const passwordForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const savingProfile = ref(false)
const changingPassword = ref(false)
const uploadingImage = ref(false)
const removingImage = ref(false)
const selectedImageFile = ref<File | null>(null)
const selectedImagePreview = ref('')
const cropScale = ref(1)
const cropX = ref(0)
const cropY = ref(0)
const profileIncompleteToastShown = ref(false)
const profileModalOpen = ref(false)
const photoModalOpen = ref(false)
const passwordModalOpen = ref(false)
const photoPreviewOpen = ref(false)

const profileItems = computed(() => [
  { label: 'Nama', value: profile.value?.fullName || profile.value?.user?.name || '-' },
  { label: 'Email', value: profile.value?.user?.email || '-' },
  { label: 'Role', value: profile.value?.user?.role || '-' },
  { label: 'Telepon', value: profile.value?.phone || '-' },
])

function syncProfileForm() {
  profileForm.fullName = profile.value?.fullName || profile.value?.user?.name || ''
  profileForm.phone = profile.value?.phone || ''
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'
}

function getStatusColor(status: string) {
  if (status === 'checked_in' || status === 'finished') return 'success'
  if (status === 'cancelled') return 'error'
  if (status === 'called') return 'warning'
  return 'primary'
}

async function submitProfile() {
  if (!profileForm.fullName.trim() || !profileForm.phone.trim()) {
    toast.add({ title: 'Form belum lengkap', description: 'Nama dan telepon wajib diisi.', color: 'warning' })
    return
  }

  if (profileForm.phone.trim().length < 8) {
    toast.add({ title: 'Telepon tidak valid', description: 'Minimal 8 karakter.', color: 'warning' })
    return
  }

  savingProfile.value = true
  try {
    await $fetch('/api/patient/me', {
      method: 'PATCH',
      body: {
        fullName: profileForm.fullName.trim(),
        phone: profileForm.phone.trim(),
      },
    })

    toast.add({ title: 'Profil diperbarui', description: 'Nama dan telepon berhasil disimpan.', color: 'success' })
    profileModalOpen.value = false
    await refresh()
  }
  catch (fetchError: any) {
    toast.add({ title: 'Simpan profil gagal', description: fetchError?.data?.statusMessage || fetchError?.message || 'Coba lagi.', color: 'error' })
  }
  finally {
    savingProfile.value = false
  }
}

async function submitChangePassword() {
  if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
    toast.add({ title: 'Form belum lengkap', description: 'Semua field sandi wajib diisi.', color: 'warning' })
    return
  }

  if (passwordForm.newPassword.length < 6) {
    toast.add({ title: 'Sandi terlalu pendek', description: 'Minimal 6 karakter.', color: 'warning' })
    return
  }

  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    toast.add({ title: 'Konfirmasi tidak sama', description: 'Ulangi konfirmasi sandi baru.', color: 'warning' })
    return
  }

  changingPassword.value = true
  try {
    await $fetch('/api/auth/change-password', {
      method: 'POST',
      body: {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        revokeOtherSessions: false,
      },
    })

    toast.add({ title: 'Sandi berhasil diubah', description: 'Gunakan sandi baru saat login berikutnya.', color: 'success' })
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    passwordModalOpen.value = false
  }
  catch (fetchError: any) {
    toast.add({ title: 'Ubah sandi gagal', description: fetchError?.data?.message || fetchError?.data?.statusMessage || fetchError?.message || 'Coba lagi.', color: 'error' })
  }
  finally {
    changingPassword.value = false
  }
}

function resetSelectedImage() {
  selectedImageFile.value = null
  cropScale.value = 1
  cropX.value = 0
  cropY.value = 0
  if (selectedImagePreview.value) URL.revokeObjectURL(selectedImagePreview.value)
  selectedImagePreview.value = ''
}

function handleImageChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  resetSelectedImage()
  selectedImageFile.value = file
  selectedImagePreview.value = file ? URL.createObjectURL(file) : ''
}

function zoomInCrop() {
  cropScale.value = Math.min(2.5, Number((cropScale.value + 0.1).toFixed(2)))
}

function zoomOutCrop() {
  cropScale.value = Math.max(1, Number((cropScale.value - 0.1).toFixed(2)))
}

async function buildCroppedImageFile() {
  if (!selectedImagePreview.value) return selectedImageFile.value

  const image = new Image()
  image.src = selectedImagePreview.value
  await new Promise((resolve, reject) => {
    image.onload = resolve
    image.onerror = reject
  })

  const side = Math.min(image.width, image.height)
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const context = canvas.getContext('2d')
  if (!context) return selectedImageFile.value

  const zoom = cropScale.value
  const cropSize = side / zoom
  const maxX = Math.max(0, image.width - cropSize)
  const maxY = Math.max(0, image.height - cropSize)
  const sourceX = Math.min(maxX, Math.max(0, (image.width - cropSize) / 2 + cropX.value * maxX))
  const sourceY = Math.min(maxY, Math.max(0, (image.height - cropSize) / 2 + cropY.value * maxY))

  context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, 512, 512)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
  if (!blob) return selectedImageFile.value

  return new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' })
}

async function compressImageFile(file: File) {
  const image = new Image()
  image.src = URL.createObjectURL(file)

  await new Promise((resolve, reject) => {
    image.onload = resolve
    image.onerror = reject
  })

  const maxSide = 1600
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))

  const context = canvas.getContext('2d')
  if (!context) return file

  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  URL.revokeObjectURL(image.src)

  let quality = 0.86
  let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))

  while (blob && blob.size > 5 * 1024 * 1024 && quality > 0.45) {
    quality -= 0.08
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  }

  if (!blob) return file
  return new File([blob], `avatar-compressed-${Date.now()}.jpg`, { type: 'image/jpeg' })
}

async function submitProfileImage() {
  if (!selectedImageFile.value) {
    toast.add({ title: 'Foto belum dipilih', description: 'Pilih gambar profil dulu.', color: 'warning' })
    return
  }

  if (!selectedImageFile.value.type.startsWith('image/')) {
    toast.add({ title: 'File tidak valid', description: 'Gunakan file gambar.', color: 'warning' })
    return
  }

  uploadingImage.value = true
  try {
    let uploadFile = await buildCroppedImageFile()
    if (uploadFile && uploadFile.size > 5 * 1024 * 1024) {
      toast.add({ title: 'Foto besar', description: 'Sedang dikompres otomatis sebelum upload.', color: 'info' })
      uploadFile = await compressImageFile(uploadFile)
    }

    if (uploadFile && uploadFile.size > 5 * 1024 * 1024) {
      toast.add({ title: 'File masih terlalu besar', description: 'Coba gambar lain dengan ukuran lebih kecil.', color: 'warning' })
      return
    }

    const formData = new FormData()
    if (uploadFile) formData.append('profileImage', uploadFile)
    await $fetch('/api/patient/me/profile-image', { method: 'POST', body: formData })

    toast.add({ title: 'Foto profil diperbarui', description: 'Foto baru sudah tersimpan.', color: 'success' })
    photoModalOpen.value = false
    resetSelectedImage()
    await refresh()
  }
  catch (fetchError: any) {
    toast.add({ title: 'Upload gagal', description: fetchError?.data?.statusMessage || fetchError?.message || 'Coba lagi.', color: 'error' })
  }
  finally {
    uploadingImage.value = false
  }
}

async function removeProfileImage() {
  if (!profile.value?.user?.image && !selectedImagePreview.value) {
    toast.add({ title: 'Foto tidak ada', description: 'Belum ada foto profil untuk dihapus.', color: 'warning' })
    return
  }

  removingImage.value = true
  try {
    await $fetch('/api/patient/me/profile-image', { method: 'DELETE' })
    resetSelectedImage()
    toast.add({ title: 'Foto profil dihapus', description: 'Avatar kembali ke default.', color: 'success' })
    photoModalOpen.value = false
    await refresh()
  }
  catch (fetchError: any) {
    toast.add({ title: 'Hapus foto gagal', description: fetchError?.data?.statusMessage || fetchError?.message || 'Coba lagi.', color: 'error' })
  }
  finally {
    removingImage.value = false
  }
}

onMounted(async () => {
  await refresh()
  syncProfileForm()
})

watch(() => profile.value, (value) => {
  syncProfileForm()
  if (!value) return
  if (!profileIncompleteToastShown.value && (!value.fullName?.trim() || !value.phone?.trim())) {
    profileIncompleteToastShown.value = true
    toast.add({ title: 'Profil belum lengkap', description: 'Isi nama dan telepon dulu sebelum lanjut booking.', color: 'warning' })
  }
}, { immediate: true })

watch(error, (value) => {
  if (value) {
    toast.add({ title: 'Profil gagal dimuat', description: 'Coba muat ulang halaman profil pasien.', color: 'error' })
  }
})

onBeforeUnmount(() => {
  resetSelectedImage()
})
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 px-4 pb-6 sm:px-0">
    <UPageGrid>
      <UPageCard v-for="item in summaryCards" :key="item.label" :title="item.label" :description="item.value" :icon="item.icon" />
    </UPageGrid>

    <UPageCard>
      <template #header>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="space-y-1">
            <h1 class="text-2xl font-semibold">Profil pasien</h1>
            <p class="text-sm text-muted">Data akun dan ringkasan booking pasien yang sedang login.</p>
          </div>
          <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" :loading="pending" @click="refresh">
            Muat ulang
          </UButton>
        </div>
      </template>

      <div v-if="error" class="rounded-2xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
        Gagal memuat profil pasien.
      </div>

      <div v-else class="space-y-6">
        <div class="flex flex-col gap-4 rounded-3xl border border-default bg-elevated/30 p-4 sm:flex-row sm:items-center">
          <UAvatar :src="selectedImagePreview || profile?.user?.image || undefined" :alt="profile?.fullName || 'Pasien'" size="3xl" />
          <div class="min-w-0 flex-1">
            <h2 class="truncate text-xl font-semibold">{{ profile?.fullName || '-' }}</h2>
            <p class="truncate text-sm text-muted">{{ profile?.user?.email || '-' }}</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <UBadge color="primary" variant="subtle">{{ profile?.user?.role || 'patient' }}</UBadge>
              <UBadge color="neutral" variant="subtle">Terdaftar {{ formatDate(profile?.user?.createdAt) }}</UBadge>
            </div>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <UPageCard v-for="item in profileItems" :key="item.label" :title="item.label" :description="item.value" />
        </div>
      </div>
    </UPageCard>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div class="space-y-6">
        <UPageCard title="Aksi profil" description="Semua pengaturan profil dipindah ke modal agar halaman lebih rapi.">
          <div class="grid gap-3 sm:grid-cols-3">
            <UButton icon="i-lucide-user-round-cog" color="primary" @click="profileModalOpen = true">Edit profil</UButton>
            <UButton icon="i-lucide-image-up" color="neutral" variant="outline" @click="photoModalOpen = true">Foto profil</UButton>
            <UButton icon="i-lucide-key-round" color="neutral" variant="outline" @click="passwordModalOpen = true">Ubah sandi</UButton>
          </div>
        </UPageCard>

        <UPageCard title="Aktivitas akun" description="Diambil dari booking terbaru pasien.">
          <div class="profile-table overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead class="border-b border-default text-left text-muted">
                <tr>
                  <th class="px-4 py-3 font-medium">Waktu</th>
                  <th class="px-4 py-3 font-medium">Aksi</th>
                  <th class="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!pending && recentActivities.length === 0" class="border-b border-default/60 last:border-b-0">
                  <td colspan="3" class="px-4 py-8 text-center text-muted">Belum ada aktivitas booking.</td>
                </tr>
                <tr v-for="row in recentActivities" :key="`${row.waktu}-${row.aksi}`" class="border-b border-default/60 last:border-b-0">
                  <td class="px-4 py-3 font-medium" data-label="Waktu">{{ row.waktu }}</td>
                  <td class="px-4 py-3" data-label="Aksi">{{ row.aksi }}</td>
                  <td class="px-4 py-3" data-label="Status"><UBadge :color="getStatusColor(row.status)" variant="subtle">{{ row.status }}</UBadge></td>
                </tr>
              </tbody>
            </table>
          </div>
        </UPageCard>
      </div>

      <UPageCard title="Ringkasan akun" description="Akses cepat untuk foto, kontak, dan keamanan akun.">
        <div class="space-y-4">
          <div class="flex items-center gap-4 rounded-2xl border border-default bg-elevated/30 p-4">
            <UAvatar :src="profile?.user?.image || undefined" :alt="profile?.fullName || 'Pasien'" size="xl" />
            <div class="min-w-0 flex-1">
              <p class="font-semibold">{{ profile?.fullName || '-' }}</p>
              <p class="truncate text-sm text-muted">{{ profile?.phone || 'Telepon belum diisi' }}</p>
            </div>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-2xl border border-default bg-elevated/30 p-4"><p class="text-xs uppercase tracking-[0.12em] text-muted">Email</p><p class="mt-2 break-all font-medium">{{ profile?.user?.email || '-' }}</p></div>
            <div class="rounded-2xl border border-default bg-elevated/30 p-4"><p class="text-xs uppercase tracking-[0.12em] text-muted">Role</p><p class="mt-2 font-medium">{{ profile?.user?.role || 'patient' }}</p></div>
          </div>
        </div>
      </UPageCard>
    </div>

    <UModal v-model:open="profileModalOpen" :ui="{ content: 'sm:max-w-lg max-h-[85vh] overflow-y-auto' }" title="Edit profil">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Nama lengkap" required>
            <UInput v-model="profileForm.fullName" placeholder="Nama pasien" />
          </UFormField>
          <UFormField label="Nomor telepon" required>
            <UInput v-model="profileForm.phone" placeholder="08xxxxxxxxxx" inputmode="tel" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <UButton label="Batal" color="neutral" variant="ghost" @click="profileModalOpen = false" />
          <UButton icon="i-lucide-save" :loading="savingProfile" @click="submitProfile">Simpan profil</UButton>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="photoModalOpen" :ui="{ content: 'sm:max-w-2xl max-h-[85vh] overflow-y-auto' }" title="Foto profil">
      <template #body>
        <div class="space-y-4">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div class="space-y-3">
              <div class="avatar-crop-frame overflow-hidden rounded-3xl border border-default bg-elevated/40">
                <img v-if="selectedImagePreview || profile?.user?.image" :src="selectedImagePreview || profile?.user?.image || undefined" alt="Preview avatar" class="avatar-crop-image" :style="{ transform: `translate(${cropX * 22}px, ${cropY * 22}px) scale(${cropScale})` }">
                <div v-else class="flex h-full items-center justify-center text-sm text-muted">Belum ada foto</div>
              </div>
              <UAvatar :src="selectedImagePreview || profile?.user?.image || undefined" :alt="profile?.fullName || 'Pasien'" size="3xl" />
            </div>

            <div class="min-w-0 flex-1 space-y-4">
              <UInput type="file" accept="image/png,image/jpeg,image/webp" @change="handleImageChange" />
              <p class="text-xs text-muted">Gunakan JPG, PNG, atau WebP. Maksimal 5MB.</p>

              <div v-if="selectedImagePreview" class="grid gap-4 sm:grid-cols-3">
                <div class="sm:col-span-3 flex flex-col gap-3 sm:flex-row">
                  <UButton icon="i-lucide-zoom-out" color="neutral" variant="outline" @click="zoomOutCrop">Zoom out</UButton>
                  <UButton icon="i-lucide-zoom-in" color="neutral" variant="outline" @click="zoomInCrop">Zoom in</UButton>
                </div>
                <UFormField label="Zoom">
                  <URange v-model="cropScale" :min="1" :max="2.5" :step="0.05" />
                </UFormField>
                <UFormField label="Geser X">
                  <URange v-model="cropX" :min="-1" :max="1" :step="0.05" />
                </UFormField>
                <UFormField label="Geser Y">
                  <URange v-model="cropY" :min="-1" :max="1" :step="0.05" />
                </UFormField>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <UButton label="Batal" color="neutral" variant="ghost" @click="photoModalOpen = false" />
          <UButton icon="i-lucide-expand" color="neutral" variant="outline" :disabled="!selectedImagePreview && !profile?.user?.image" @click="photoPreviewOpen = true">Lihat foto penuh</UButton>
          <UButton icon="i-lucide-trash-2" color="error" variant="soft" :loading="removingImage" :disabled="!profile?.user?.image && !selectedImagePreview" @click="removeProfileImage">Hapus foto</UButton>
          <UButton icon="i-lucide-rotate-ccw" color="neutral" variant="outline" :disabled="!selectedImagePreview" @click="cropScale = 1; cropX = 0; cropY = 0">Reset crop</UButton>
          <UButton icon="i-lucide-upload" :loading="uploadingImage" :disabled="!selectedImageFile" @click="submitProfileImage">Upload foto</UButton>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="passwordModalOpen" :ui="{ content: 'sm:max-w-lg max-h-[85vh] overflow-y-auto' }" title="Ubah sandi">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Sandi lama" required>
            <UInput v-model="passwordForm.currentPassword" type="password" autocomplete="current-password" />
          </UFormField>
          <UFormField label="Sandi baru" required>
            <UInput v-model="passwordForm.newPassword" type="password" autocomplete="new-password" />
          </UFormField>
          <UFormField label="Konfirmasi sandi baru" required>
            <UInput v-model="passwordForm.confirmPassword" type="password" autocomplete="new-password" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <UButton label="Batal" color="neutral" variant="ghost" @click="passwordModalOpen = false" />
          <UButton icon="i-lucide-key-round" :loading="changingPassword" @click="submitChangePassword">Simpan sandi baru</UButton>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="photoPreviewOpen" :ui="{ content: 'sm:max-w-3xl max-h-[85vh] overflow-y-auto' }" title="Foto profil penuh">
      <template #body>
        <div class="flex justify-center rounded-3xl border border-default bg-elevated/30 p-3 sm:p-5">
          <img v-if="selectedImagePreview || profile?.user?.image" :src="selectedImagePreview || profile?.user?.image || undefined" alt="Foto profil penuh" class="max-h-[70vh] w-full rounded-2xl object-contain" />
          <div v-else class="py-12 text-sm text-muted">Belum ada foto profil.</div>
        </div>
      </template>
      <template #footer>
        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <UButton label="Tutup" color="neutral" variant="ghost" @click="photoPreviewOpen = false" />
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.avatar-crop-frame {
  position: relative;
  width: 220px;
  height: 220px;
}

.avatar-crop-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform-origin: center;
}

@media (max-width: 767px) {
  .profile-table table thead {
    display: none;
  }

  .profile-table table,
  .profile-table tbody,
  .profile-table tr,
  .profile-table td {
    display: block;
    width: 100%;
  }

  .profile-table tr {
    margin-bottom: 1rem;
    overflow: hidden;
    border: 1px solid rgb(226 232 240);
    border-radius: 1rem;
    background: white;
  }

  .profile-table td {
    padding: 0.875rem 1rem;
    border-bottom: 1px solid rgb(241 245 249);
  }

  .profile-table td::before {
    content: attr(data-label);
    display: block;
    margin-bottom: 0.35rem;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgb(100 116 139);
  }

  .profile-table td:last-child {
    border-bottom: none;
  }

  .avatar-crop-frame {
    width: 100%;
    max-width: 220px;
    height: auto;
    aspect-ratio: 1 / 1;
  }
}
</style>
