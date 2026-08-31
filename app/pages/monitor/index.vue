<script setup lang="ts">
import { createError } from 'h3'
import { getAuthSession } from '~~/app/utils/auth'
import { toClinicSlug } from '~~/shared/utils/clinic-slug'

definePageMeta({
  role: 'monitor',
  layout: 'monitor',
  middleware: 'auth-monitor',
  alias: ['/monitor/:cabang']
})

type MonitorQueue = {
  id: string
  queueNumber: string
  status: string
  doctor?: {
    fullName?: string | null
    clinic?: { id?: string | null, name?: string | null } | null
    service?: { name?: string | null } | null
  } | null
  checkIn?: {
    booking?: {
      patient?: { fullName?: string | null } | null
    } | null
  } | null
}

type MonitorCurrent = {
  currentQueue: MonitorQueue | null
  nextQueue: MonitorQueue | null
  waitingQueues: MonitorQueue[]
  selectedClinicId?: string | null
  lastUpdatedAt?: string
}

type MonitorVideo = { id: string, title: string, youtubeUrl: string }
type MonitorConfig = { title?: string, queueLabel?: string, soundRepeatCount?: number, showTicker?: boolean }
type ClinicRow = { id: string, name: string }
type ClinicOption = { label: string, value: string, slug?: string }

const route = useRoute()
const router = useRouter()
const session = await getAuthSession()
const clinicSlug = computed(() => typeof route.params.cabang === 'string' ? route.params.cabang : '')
const isLockedMonitor = computed(() => session?.user?.role === 'monitor' && Boolean(session?.user?.monitorClinicId))

const { data: clinicsData } = await useFetch('/api/clinics')
const clinics = computed(() => (clinicsData.value?.data ?? []) as ClinicRow[])
const clinicOptions = computed<ClinicOption[]>(() => [
  { label: 'Semua Klinik', value: '', slug: '' },
  ...clinics.value.map(clinic => ({
    label: clinic.name,
    value: clinic.id,
    slug: toClinicSlug(clinic.name)
  }))
])
const selectedClinicFromSlug = computed(() => clinics.value.find(clinic => toClinicSlug(clinic.name) === clinicSlug.value) || null)
const selectedClinicId = computed(() => {
  if (session?.user?.role === 'monitor' && session.user.monitorClinicId) return session.user.monitorClinicId
  if (typeof route.query.clinicId === 'string' && route.query.clinicId) return route.query.clinicId
  return selectedClinicFromSlug.value?.id || ''
})
const lockedClinicSlug = computed(() => {
  const clinic = clinics.value.find(item => item.id === session?.user?.monitorClinicId)
  return clinic ? toClinicSlug(clinic.name) : ''
})

if (clinicSlug.value && !selectedClinicFromSlug.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Cabang klinik tidak ditemukan'
  })
}

const { data: currentData, pending, refresh } = await useFetch('/api/monitor/current', {
  query: computed(() => selectedClinicId.value ? { clinicId: selectedClinicId.value } : undefined)
})
const { data: videosData, refresh: refreshVideos } = await useFetch('/api/monitor/videos')
const { data: tickerData, refresh: refreshTicker } = await useFetch('/api/monitor/ticker')
const { data: configData, refresh: refreshConfig } = await useFetch('/api/monitor/config')

const current = computed(() => (currentData.value?.data ?? {}) as MonitorCurrent)
const videos = computed(() => (videosData.value?.data ?? []) as MonitorVideo[])
const tickerRows = computed(() => (tickerData.value?.data ?? []) as string[])
const config = computed(() => (configData.value?.data ?? {}) as MonitorConfig)
const firstVideo = computed(() => videos.value[0])
const activeClinicLabel = computed(() => clinicOptions.value.find(item => item.value === selectedClinicId.value)?.label || config.value.title || 'Sistem Antrean Klinik')
const currentQueueNumber = computed(() => current.value.currentQueue?.queueNumber || '-')
const nextQueueNumber = computed(() => current.value.nextQueue?.queueNumber || '-')
const waitingQueues = computed(() => current.value.waitingQueues ?? [])

const audioEnabled = ref(false)
const blinkActive = ref(false)
const announceText = ref('')
const lastAnnouncedQueueId = ref('')
const videoResumeKey = ref(0)
const announcing = ref(false)
let blinkTimer: ReturnType<typeof setTimeout> | null = null
let currentPollTimer: ReturnType<typeof setInterval> | null = null
let metaPollTimer: ReturnType<typeof setInterval> | null = null

function getYoutubeEmbed(url?: string) {
  if (!url) return ''
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([^?&/]+)/)
  const videoId = match?.[1]
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}` : ''
}

function formatTime(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function triggerBlink() {
  blinkActive.value = true
  if (blinkTimer) clearTimeout(blinkTimer)
  blinkTimer = setTimeout(() => {
    blinkActive.value = false
  }, 7000)
}

async function playTone(repeatCount = 1) {
  if (!audioEnabled.value || !import.meta.client) return

  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextCtor) return

  const total = Math.min(Math.max(repeatCount, 1), 5)

  for (let index = 0; index < total; index += 1) {
    const context = new AudioContextCtor()
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = index % 2 === 0 ? 880 : 988
    gain.gain.setValueAtTime(0.001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.45)

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.46)
    oscillator.onended = () => context.close().catch(() => null)

    await new Promise(resolve => setTimeout(resolve, 520))
  }
}

function buildNaturalQueueText(queueNumber: string) {
  return queueNumber.toUpperCase().split('').join(' ')
}

function enableAudio() {
  audioEnabled.value = true
  playTone(1)
}

async function speakQueue(queue: MonitorQueue, repeatCount = 3) {
  if (!audioEnabled.value || !import.meta.client || !('speechSynthesis' in window)) return

  const message = `Nomor antrean, ${buildNaturalQueueText(queue.queueNumber)}. Silakan menuju ${queue.doctor?.clinic?.name || 'ruang pemeriksaan'}.`
  const total = Math.min(Math.max(repeatCount, 1), 3)

  window.speechSynthesis.cancel()

  for (let index = 0; index < total; index += 1) {
    await new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(message)
      utterance.lang = 'id-ID'
      utterance.rate = 0.82
      utterance.pitch = 1
      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()
      window.speechSynthesis.speak(utterance)
    })

    if (index < total - 1) {
      await new Promise(resolve => setTimeout(resolve, 450))
    }
  }
}

async function announceQueue(queue: MonitorQueue) {
  if (announcing.value) return

  announcing.value = true

  try {
    await playTone(1)
    await speakQueue(queue, 3)
  } finally {
    announcing.value = false
    videoResumeKey.value += 1
  }
}

function updateClinicFilter(value: string) {
  if (isLockedMonitor.value) return
  const target = clinicOptions.value.find(item => item.value === value)
  router.replace(target?.slug ? `/monitor/${target.slug}` : '/monitor')
}

watch([() => isLockedMonitor.value, () => lockedClinicSlug.value, () => clinicSlug.value], ([locked, lockedSlug, currentSlug]) => {
  if (!locked || !lockedSlug) return
  if (currentSlug === lockedSlug) return
  router.replace(`/monitor/${lockedSlug}`)
}, { immediate: true })

watch(() => selectedClinicId.value, () => {
  lastAnnouncedQueueId.value = ''
  announceText.value = ''
})

watch(() => current.value.currentQueue?.id, (queueId) => {
  if (!queueId) {
    announceText.value = ''
    return
  }

  if (queueId === lastAnnouncedQueueId.value) return

  lastAnnouncedQueueId.value = queueId
  announceText.value = `Nomor ${current.value.currentQueue?.queueNumber || '-'} sedang dipanggil`
  triggerBlink()
  if (current.value.currentQueue) announceQueue(current.value.currentQueue)
})

onBeforeUnmount(() => {
  if (blinkTimer) clearTimeout(blinkTimer)
  if (currentPollTimer) clearInterval(currentPollTimer)
  if (metaPollTimer) clearInterval(metaPollTimer)
  if (import.meta.client && 'speechSynthesis' in window) window.speechSynthesis.cancel()
})

onMounted(() => {
  currentPollTimer = setInterval(() => {
    refresh()
  }, 1000)

  metaPollTimer = setInterval(() => {
    refreshTicker()
    refreshConfig()
    refreshVideos()
  }, 30000)
})
</script>

<template>
  <div class="grid min-h-screen grid-cols-1 xl:grid-cols-[1.6fr_1fr]">
    <div class="space-y-6 bg-white px-8 py-8">
      <div class="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Monitor Klinik
          </p>
          <h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {{ activeClinicLabel }}
          </h1>
          <p
            v-if="isLockedMonitor"
            class="mt-2 text-sm text-slate-500"
          >
            Akun ini dikunci ke cabang klinik sendiri.
          </p>
        </div>
        <div class="w-full lg:w-[320px]">
          <UFormField label="Cabang klinik">
            <USelectMenu
              :model-value="selectedClinicId"
              value-key="value"
              option-attribute="label"
              :items="clinicOptions"
              :disabled="isLockedMonitor"
              @update:model-value="updateClinicFilter"
            />
          </UFormField>
        </div>
      </div>

      <div class="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div class="aspect-video bg-slate-950">
          <iframe
            v-if="firstVideo"
            :key="`${firstVideo.id}-${videoResumeKey}`"
            class="size-full"
            :src="getYoutubeEmbed(firstVideo.youtubeUrl)"
            :title="firstVideo.title"
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerpolicy="strict-origin-when-cross-origin"
          />
          <div
            v-else
            class="flex size-full items-center justify-center text-sm text-white/70"
          >
            Belum ada video aktif.
          </div>
        </div>
        <div class="border-t border-slate-200 px-6 py-5">
          <div class="flex items-center gap-3 text-slate-600">
            <UIcon
              name="i-lucide-play-circle"
              class="size-5"
            /><span class="text-lg font-semibold text-slate-900">{{ firstVideo?.title || 'Video edukasi' }}</span>
          </div>
        </div>
      </div>

      <div class="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Antrean Menunggu
            </p>
            <p class="mt-1 text-sm text-slate-500">
              Hanya tampil untuk cabang klinik terpilih.
            </p>
          </div>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            :loading="pending"
            @click="refresh"
          />
        </div>
        <div class="divide-y divide-slate-200">
          <div
            v-if="waitingQueues.length === 0"
            class="px-6 py-8 text-center text-sm text-slate-500"
          >
            Belum ada antrean menunggu.
          </div>
          <div
            v-for="row in waitingQueues"
            :key="row.id"
            class="flex items-center justify-between gap-4 px-6 py-4"
          >
            <div>
              <p class="text-2xl font-bold tracking-tight text-slate-900">
                {{ row.queueNumber }}
              </p>
              <p class="mt-1 text-sm font-medium text-slate-700">
                {{ row.checkIn?.booking?.patient?.fullName || '-' }}
              </p>
              <p class="text-xs text-slate-500">
                {{ row.doctor?.fullName || '-' }} • {{ row.doctor?.service?.name || 'Poli Klinik' }}
              </p>
            </div>
            <UBadge
              color="primary"
              variant="subtle"
            >
              {{ row.status }}
            </UBadge>
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-5 bg-[#f7f9fc] px-8 py-8">
      <div
        :class="blinkActive ? 'monitor-alert ring-4 ring-primary/30' : ''"
        class="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300"
      >
        <div class="mb-4 flex items-center justify-between gap-3 text-sm font-semibold text-primary">
          <div class="flex items-center gap-3">
            <span
              :class="blinkActive ? 'animate-pulse' : ''"
              class="size-2.5 rounded-full bg-primary"
            /><span>{{ config.queueLabel || 'PANGGILAN SAAT INI' }}</span>
          </div>
          <div class="flex items-center gap-2">
            <UBadge
              :color="audioEnabled ? 'success' : 'warning'"
              variant="subtle"
            >
              {{ audioEnabled ? 'Suara aktif' : 'Suara mati' }}
            </UBadge>
            <UButton
              v-if="!audioEnabled"
              color="warning"
              variant="soft"
              icon="i-lucide-volume-2"
              @click="enableAudio"
            >
              Aktifkan suara
            </UButton>
            <span class="text-xs text-slate-400">{{ formatTime(current.lastUpdatedAt) }}</span>
          </div>
        </div>
        <p
          :class="blinkActive ? 'animate-pulse text-primary' : ''"
          class="text-[72px] font-bold leading-[0.92] tracking-tight xl:text-[84px]"
        >
          {{ currentQueueNumber }}
        </p>
        <div class="mt-5 flex items-center gap-3 text-2xl font-semibold text-slate-900">
          <UIcon
            name="i-lucide-door-open"
            class="size-6"
          /><span>{{ current.currentQueue?.doctor?.clinic?.name || activeClinicLabel }}</span>
        </div>
        <p class="mt-3 text-sm font-medium text-slate-500">
          {{ announceText || 'Monitor siap menampilkan nomor panggilan terbaru' }}
        </p>
      </div>

      <div class="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div class="space-y-6">
          <div class="flex items-start gap-4">
            <div class="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UIcon
                name="i-lucide-briefcase-medical"
                class="size-5"
              />
            </div><div>
              <p class="text-base text-slate-500">
                Dokter Pemeriksa
              </p><p class="text-2xl font-semibold text-slate-900">
                {{ current.currentQueue?.doctor?.fullName || '-' }}
              </p>
            </div>
          </div>
          <div class="flex items-start gap-4">
            <div class="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UIcon
                name="i-lucide-user-round"
                class="size-5"
              />
            </div><div>
              <p class="text-base text-slate-500">
                Pasien Dipanggil
              </p><p class="text-2xl font-semibold text-slate-900">
                {{ current.currentQueue?.checkIn?.booking?.patient?.fullName || '-' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-[22px] border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <p class="text-sm text-slate-500">
              Antrean Selanjutnya
            </p><p class="mt-2 text-3xl font-semibold text-slate-900">
              {{ nextQueueNumber }}
            </p><p class="mt-1 text-sm text-slate-500">
              {{ current.nextQueue?.doctor?.fullName || 'Menunggu panggilan' }}
            </p>
          </div>
          <div>
            <p class="text-sm text-slate-500">
              Ticker
            </p><p class="mt-2 text-sm font-semibold leading-6 text-slate-900">
              {{ config.showTicker === false ? 'Ticker dimatikan dari admin settings' : (tickerRows[0] || '-') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.monitor-alert {
  animation: monitor-blink 0.8s ease-in-out 8;
}

@keyframes monitor-blink {
  0%, 100% {
    background: white;
    transform: scale(1);
  }

  50% {
    background: rgb(240 253 250);
    transform: scale(1.01);
  }
}
</style>
