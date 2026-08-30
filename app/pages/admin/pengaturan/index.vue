<script setup lang="ts">
definePageMeta({ role: 'admin', layout: 'admin' })

const tabs = [
  { label: 'Profil Klinik', icon: 'i-lucide-building-2' },
  { label: 'Monitor', icon: 'i-lucide-monitor-play' },
  { label: 'Printer', icon: 'i-lucide-printer' }
]

const selectedTab = ref('Profil Klinik')
const saving = ref(false)
const savedAt = ref('')
const { data, pending, refresh } = await useFetch('/api/admin/settings')

const form = reactive({
  clinicName: '',
  supportEmail: '',
  timezone: 'Asia/Jakarta',
  monitorTickerEnabled: true,
  defaultMonitorLabel: '',
  defaultPrinterMode: 'chunk',
  monitorTickerMessages: ['Anda dipanggil', 'Siapkan kartu identitas dan bukti booking', 'Selamat datang di Klinik Sehatku', 'Silakan tunggu panggilan sesuai nomor antrean'].join('\n'),
  monitorSoundRepeatCount: 2
})

const tickerPreviewItems = computed(() => String(form.monitorTickerMessages || '').split('\n').map((item) => item.trim()).filter(Boolean))
const soundRepeatLabel = computed(() => `${Number(form.monitorSoundRepeatCount || 2)}x`)

watch(() => data.value?.data, (value) => {
  if (!value) return
  Object.assign(form, {
    ...value,
    monitorTickerMessages: Array.isArray(value.monitorTickerMessages) ? value.monitorTickerMessages.join('\n') : form.monitorTickerMessages,
    monitorSoundRepeatCount: Number(value.monitorSoundRepeatCount ?? 2)
  })
}, { immediate: true })

async function saveSettings() {
  saving.value = true
  try {
    const result = await $fetch('/api/admin/settings', {
      method: 'POST',
      body: {
        ...form,
        monitorTickerMessages: String(form.monitorTickerMessages || '').split('\n').map((item) => item.trim()).filter(Boolean),
        monitorSoundRepeatCount: Number(form.monitorSoundRepeatCount || 2)
      }
    })

    Object.assign(form, {
      ...result.data,
      monitorTickerMessages: Array.isArray(result.data.monitorTickerMessages) ? result.data.monitorTickerMessages.join('\n') : form.monitorTickerMessages,
      monitorSoundRepeatCount: Number(result.data.monitorSoundRepeatCount ?? 2)
    })
    savedAt.value = new Date().toLocaleTimeString('id-ID')
    await refresh()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="admin-page">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-4xl font-semibold tracking-tight">Pengaturan Sistem</h1>
        <p class="mt-2 text-lg text-muted">Pengaturan tersimpan ke storage dummy backend supaya panel admin langsung hidup.</p>
      </div>
      <div class="flex gap-3">
        <UButton label="Muat Ulang" icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="pending" @click="refresh" />
        <UButton label="Simpan Perubahan" icon="i-lucide-save" color="primary" :loading="saving" @click="saveSettings" />
      </div>
    </div>

    <div class="flex flex-wrap gap-6 border-b border-default pb-4">
      <button v-for="tab in tabs" :key="tab.label" class="flex items-center gap-2 border-b-2 pb-3 text-base" :class="selectedTab === tab.label ? 'border-primary text-primary' : 'border-transparent text-muted'" @click="selectedTab = tab.label">
        <UIcon :name="tab.icon" class="size-5" />{{ tab.label }}
      </button>
    </div>

    <div class="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <UPageCard class="admin-table-card">
        <div class="space-y-6">
          <div>
            <h2 class="text-3xl font-semibold">Ringkasan</h2>
            <p class="mt-3 text-lg text-muted">Sumber data dari `/api/admin/settings`.</p>
          </div>
          <div class="space-y-4 text-sm">
            <div class="rounded-2xl border border-default p-4"><p class="text-muted">Status</p><p class="mt-2 font-semibold">{{ pending ? 'Memuat...' : 'Siap disimpan' }}</p></div>
            <div class="rounded-2xl border border-default p-4"><p class="text-muted">Zona Waktu</p><p class="mt-2 font-semibold">{{ form.timezone }}</p></div>
            <div class="rounded-2xl border border-default p-4"><p class="text-muted">Simpan Terakhir</p><p class="mt-2 font-semibold">{{ savedAt || '-' }}</p></div>
          </div>
        </div>
      </UPageCard>

      <UPageCard class="admin-table-card">
        <div class="space-y-6">
          <h2 class="text-3xl font-semibold">Konfigurasi Dasar</h2>
          <UFormField label="Nama Klinik"><UInput v-model="form.clinicName" /></UFormField>
          <div class="grid gap-4 md:grid-cols-2">
            <UFormField label="Email Support"><UInput v-model="form.supportEmail" icon="i-lucide-mail" /></UFormField>
            <UFormField label="Zona Waktu"><UInput v-model="form.timezone" /></UFormField>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <UFormField label="Label Monitor"><UInput v-model="form.defaultMonitorLabel" /></UFormField>
            <UFormField label="Mode Printer"><UInput v-model="form.defaultPrinterMode" /></UFormField>
          </div>
          <div class="rounded-2xl border border-default p-4">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="font-semibold">Ticker monitor aktif</p>
                <p class="text-sm text-muted">Kontrol sederhana untuk panel monitor dummy.</p>
              </div>
              <input v-model="form.monitorTickerEnabled" type="checkbox" class="size-5" />
            </div>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <UFormField label="Ulang suara panggilan"><UInput v-model="form.monitorSoundRepeatCount" type="number" min="1" max="5" /></UFormField>
            <UFormField label="Pesan ticker per baris"><UTextarea v-model="form.monitorTickerMessages" :rows="6" /></UFormField>
          </div>

          <div class="space-y-4 rounded-3xl border border-default bg-elevated/30 p-5">
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 class="text-xl font-semibold">Preview Monitor</h3>
                <p class="text-sm text-muted">Preview hidup sebelum disimpan ke panel monitor.</p>
              </div>
              <div class="flex flex-wrap gap-2">
                <UBadge :color="form.monitorTickerEnabled ? 'success' : 'neutral'" variant="subtle">{{ form.monitorTickerEnabled ? 'Ticker aktif' : 'Ticker mati' }}</UBadge>
                <UBadge color="warning" variant="subtle">Suara {{ soundRepeatLabel }}</UBadge>
              </div>
            </div>

            <div class="overflow-hidden rounded-2xl border border-slate-200 bg-[#162033] py-2 text-white">
              <div v-if="form.monitorTickerEnabled" class="ticker-preview flex min-w-max items-center gap-6 whitespace-nowrap px-4 text-sm font-medium">
                <template v-if="tickerPreviewItems.length">
                  <template v-for="(item, index) in [...tickerPreviewItems, ...tickerPreviewItems]" :key="`${item}-${index}`">
                    <span class="flex items-center gap-3">
                      <span class="size-2 rounded-full bg-primary" />
                      <span>{{ item }}</span>
                    </span>
                  </template>
                </template>
                <span v-else class="flex items-center gap-3">
                  <span class="size-2 rounded-full bg-primary" />
                  <span>Belum ada pesan ticker.</span>
                </span>
              </div>
              <div v-else class="px-4 text-sm font-medium text-slate-300">Ticker dimatikan. Footer monitor akan disembunyikan.</div>
            </div>
          </div>
        </div>
      </UPageCard>
    </div>
  </div>
</template>

<style scoped>
.ticker-preview {
  animation: ticker-preview-marquee 18s linear infinite;
}

@keyframes ticker-preview-marquee {
  0% {
    transform: translateX(0);
  }

  100% {
    transform: translateX(-50%);
  }
}
</style>
