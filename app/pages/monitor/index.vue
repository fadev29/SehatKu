<script setup lang="ts">
definePageMeta({ role: 'monitor', layout: 'monitor' })

type MonitorQueue = {
  id: string
  queueNumber: string
  status: string
  doctor?: {
    fullName?: string | null
    clinic?: { name?: string | null } | null
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
  lastUpdatedAt?: string
}

type MonitorVideo = { id: string, title: string, youtubeUrl: string }
type MonitorConfig = { title?: string, queueLabel?: string, soundRepeatCount?: number, showTicker?: boolean }

const { data: currentData, pending, refresh } = await useFetch('/api/monitor/current')
const { data: videosData, refresh: refreshVideos } = await useFetch('/api/monitor/videos')
const { data: tickerData, refresh: refreshTicker } = await useFetch('/api/monitor/ticker')
const { data: configData, refresh: refreshConfig } = await useFetch('/api/monitor/config')

const current = computed(() => (currentData.value?.data ?? {}) as MonitorCurrent)
const videos = computed(() => (videosData.value?.data ?? []) as MonitorVideo[])
const tickerRows = computed(() => (tickerData.value?.data ?? []) as string[])
const config = computed(() => (configData.value?.data ?? {}) as MonitorConfig)
const firstVideo = computed(() => videos.value[0])
const currentQueueNumber = computed(() => current.value.currentQueue?.queueNumber || '-')
const nextQueueNumber = computed(() => current.value.nextQueue?.queueNumber || '-')
const waitingQueues = computed(() => current.value.waitingQueues ?? [])

const audioEnabled = ref(false)
const blinkActive = ref(false)
const announceText = ref('')
const lastAnnouncedQueueId = ref('')
const videoPaused = ref(false)
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

    await new Promise((resolve) => setTimeout(resolve, 520))
  }
}

function setVideoPaused(value: boolean) {
  videoPaused.value = value
  if (!value) {
    videoResumeKey.value += 1
  }
}

function buildNaturalQueueText(queueNumber: string) {
  return queueNumber
    .toUpperCase()
    .split('')
    .join(' ')
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
      await new Promise((resolve) => setTimeout(resolve, 700))
    }
  }
}

async function announceQueue(queue: MonitorQueue) {
  if (announcing.value) return

  announcing.value = true
  setVideoPaused(true)

  try {
    await playTone(1)
    await speakQueue(queue, 3)
  } finally {
    announcing.value = false
    setVideoPaused(false)
  }
}

watch(() => current.value.currentQueue?.id, (queueId) => {
  if (!queueId || queueId === lastAnnouncedQueueId.value) return
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
  }, 15000)
})
</script>

<template>
  <div class="grid min-h-[calc(100vh-172px)] grid-cols-1 gap-0 xl:grid-cols-[1.55fr_1fr]">
    <div class="border-r border-slate-200 px-8 py-8">
      <div class="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <iframe v-if="firstVideo && !videoPaused" :key="`${firstVideo.id}-${videoResumeKey}`" class="aspect-video w-full" :src="getYoutubeEmbed(firstVideo.youtubeUrl)" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen />
        <div v-else-if="videoPaused" class="flex aspect-video items-center justify-center bg-slate-950 px-6 text-center text-white">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">Panggilan Aktif</p>
            <p class="mt-3 text-6xl font-bold tracking-tight">{{ currentQueueNumber }}</p>
            <p class="mt-3 text-base text-slate-300">Silakan menuju ruang pemeriksaan</p>
          </div>
        </div>
        <div v-else class="flex aspect-video items-center justify-center text-muted">Belum ada video aktif</div>
        <div class="flex items-center gap-2 px-6 py-4 text-base font-semibold text-slate-500"><UIcon name="i-lucide-play-circle" class="size-5" /><span>{{ firstVideo?.title || 'VIDEO EDUKASI KESEHATAN' }}</span></div>
      </div>

      <div class="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Antrean Menunggu</p>
            <p class="mt-1 text-sm text-slate-500">Otomatis ikut update dari meja staff dan panel doctor</p>
          </div>
          <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" :loading="pending" @click="refresh" />
        </div>
        <div class="divide-y divide-slate-200">
          <div v-if="waitingQueues.length === 0" class="px-6 py-8 text-center text-sm text-slate-500">Belum ada antrean menunggu.</div>
          <div v-for="row in waitingQueues" :key="row.id" class="flex items-center justify-between gap-4 px-6 py-4">
            <div>
              <p class="text-2xl font-bold tracking-tight text-slate-900">{{ row.queueNumber }}</p>
              <p class="mt-1 text-sm font-medium text-slate-700">{{ row.checkIn?.booking?.patient?.fullName || '-' }}</p>
              <p class="text-xs text-slate-500">{{ row.doctor?.fullName || '-' }} • {{ row.doctor?.service?.name || 'Poli Klinik' }}</p>
            </div>
            <UBadge color="primary" variant="subtle">{{ row.status }}</UBadge>
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-5 bg-[#f7f9fc] px-8 py-8">
      <div :class="blinkActive ? 'monitor-alert ring-4 ring-primary/30' : ''" class="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300">
        <div class="mb-4 flex items-center justify-between gap-3 text-sm font-semibold text-primary">
          <div class="flex items-center gap-3"><span :class="blinkActive ? 'animate-pulse' : ''" class="size-2.5 rounded-full bg-primary" /><span>{{ config.queueLabel || 'PANGGILAN SAAT INI' }}</span></div>
          <div class="flex items-center gap-2">
            <UBadge :color="audioEnabled ? 'success' : 'warning'" variant="subtle">{{ audioEnabled ? 'Suara aktif' : 'Suara mati' }}</UBadge>
            <UButton v-if="!audioEnabled" color="warning" variant="soft" icon="i-lucide-volume-2" @click="enableAudio">Aktifkan suara</UButton>
            <span class="text-xs text-slate-400">{{ formatTime(current.lastUpdatedAt) }}</span>
          </div>
        </div>
        <p :class="blinkActive ? 'animate-pulse text-primary' : ''" class="text-[72px] font-bold leading-[0.92] tracking-tight xl:text-[84px]">{{ currentQueueNumber }}</p>
        <div class="mt-5 flex items-center gap-3 text-2xl font-semibold text-slate-900"><UIcon name="i-lucide-door-open" class="size-6" /><span>{{ current.currentQueue?.doctor?.clinic?.name || config.title || 'Sistem Antrean Klinik' }}</span></div>
        <p class="mt-3 text-sm font-medium text-slate-500">{{ announceText || 'Monitor siap menampilkan nomor panggilan terbaru' }}</p>
      </div>

      <div class="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div class="space-y-6">
          <div class="flex items-start gap-4"><div class="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary"><UIcon name="i-lucide-briefcase-medical" class="size-5" /></div><div><p class="text-base text-slate-500">Dokter Pemeriksa</p><p class="text-2xl font-semibold text-slate-900">{{ current.currentQueue?.doctor?.fullName || '-' }}</p></div></div>
          <div class="flex items-start gap-4"><div class="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary"><UIcon name="i-lucide-user-round" class="size-5" /></div><div><p class="text-base text-slate-500">Pasien Dipanggil</p><p class="text-2xl font-semibold text-slate-900">{{ current.currentQueue?.checkIn?.booking?.patient?.fullName || '-' }}</p></div></div>
        </div>
      </div>

      <div class="rounded-[22px] border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div class="grid gap-4 sm:grid-cols-2">
          <div><p class="text-sm text-slate-500">Antrean Selanjutnya</p><p class="mt-2 text-3xl font-semibold text-slate-900">{{ nextQueueNumber }}</p><p class="mt-1 text-sm text-slate-500">{{ current.nextQueue?.doctor?.fullName || 'Menunggu panggilan' }}</p></div>
          <div><p class="text-sm text-slate-500">Ticker</p><p class="mt-2 text-sm font-semibold leading-6 text-slate-900">{{ config.showTicker === false ? 'Ticker dimatikan dari admin settings' : (tickerRows[0] || '-') }}</p></div>
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
