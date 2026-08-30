<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { authClient } from '~~/lib/auth-client'

type MonitorConfig = {
  appName?: string
  title?: string
  showTicker?: boolean
}

const currentDate = ref(new Date())
const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

const { data: tickerData } = await useFetch('/api/monitor/ticker', { refresh: 15000 })
const { data: configData } = await useFetch('/api/monitor/config', { refresh: 15000 })

const tickerItems = computed(() => (tickerData.value?.data ?? []) as string[])
const monitorConfig = computed(() => (configData.value?.data ?? {}) as MonitorConfig)
const tickerLoop = computed(() => tickerItems.value.length ? [...tickerItems.value, ...tickerItems.value] : [])

let intervalId: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  intervalId = setInterval(() => {
    currentDate.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})

onClickOutside(menuRef, () => {
  menuOpen.value = false
})

async function handleLogout() {
  menuOpen.value = false
  await authClient.signOut().catch(() => null)
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen bg-[#171a21] text-white">
    <div class="mx-auto min-h-screen max-w-[1600px] overflow-hidden bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
      <section class="min-h-screen bg-[#f7f9fc] text-slate-900">
        <header class="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div class="flex items-center gap-3">
            <AppLogo class="h-7 w-auto text-primary" />
            <div class="h-8 w-px bg-slate-200" />
            <div>
              <p class="text-sm font-semibold text-slate-500">{{ monitorConfig.appName || 'Sehatku' }}</p>
              <p class="text-2xl font-bold leading-none tracking-tight">{{ monitorConfig.title || 'Sistem Antrean Klinik' }}</p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div class="pt-0.5 text-right">
              <p class="text-4xl font-bold leading-none tracking-tight">
                {{ currentDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }}
              </p>
              <p class="mt-1 text-sm text-slate-500 capitalize">
                {{ currentDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }}
              </p>
            </div>

            <div ref="menuRef" class="relative pt-0.5">
              <button
                class="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
                type="button"
                @click="menuOpen = !menuOpen"
              >
                <UIcon name="i-lucide-ellipsis-vertical" class="size-4" />
              </button>

              <div
                v-if="menuOpen"
                class="absolute right-0 top-12 z-50 min-w-36 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
              >
                <button
                  class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-500 transition hover:bg-red-50"
                  type="button"
                  @click="handleLogout"
                >
                  <UIcon name="i-lucide-log-out" class="size-4" />
                  <span>Keluar</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main class="p-0">
          <slot />
        </main>

        <footer v-if="monitorConfig.showTicker !== false" class="overflow-hidden bg-[#162033] py-2 text-white">
          <div class="ticker-track flex min-w-max items-center gap-6 whitespace-nowrap px-4 text-sm font-medium">
            <template v-if="tickerLoop.length">
              <template v-for="(item, index) in tickerLoop" :key="`${item}-${index}`">
                <span class="flex items-center gap-3">
                  <span class="size-2 rounded-full bg-primary" />
                  <span>{{ item }}</span>
                </span>
              </template>
            </template>
            <span v-else class="flex items-center gap-3">
              <span class="size-2 rounded-full bg-primary" />
              <span>Monitor aktif. Menunggu pesan ticker dari pengaturan admin.</span>
            </span>
          </div>
        </footer>
      </section>
    </div>
  </div>
</template>

<style scoped>
.ticker-track {
  animation: ticker-marquee 28s linear infinite;
}

@keyframes ticker-marquee {
  0% {
    transform: translateX(0);
  }

  100% {
    transform: translateX(-50%);
  }
}
</style>
