<script setup lang="ts">
import { authClient } from "~~/lib/auth-client";

const session = authClient.useSession();
const route = useRoute();
const mobileMenuOpen = ref(false);

const navLinks = computed(() => {
  const items = [
    { label: 'Beranda', to: '/', icon: 'i-lucide-house' }
  ];

  if (session.value.data?.user) {
    items.push({ label: 'Booking', to: '/booking', icon: 'i-lucide-calendar-days' });
    items.push({ label: 'Riwayat', to: '/riwayat', icon: 'i-lucide-history' });

    if (session.value.data.user.role === 'staff') items.push({ label: 'Staff', to: '/staff', icon: 'i-lucide-briefcase-medical' });
    if (session.value.data.user.role === 'doctor') items.push({ label: 'Dokter', to: '/doctor', icon: 'i-lucide-stethoscope' });
    if (session.value.data.user.role === 'admin') items.push({ label: 'Admin', to: '/admin', icon: 'i-lucide-shield-check' });
    if (session.value.data.user.role === 'monitor') items.push({ label: 'Monitor', to: '/monitor', icon: 'i-lucide-monitor-play' });

    return items;
  }

  items.push(
    { label: 'Login', to: '/login', icon: 'i-lucide-log-in' },
    { label: 'Daftar', to: '/register', icon: 'i-lucide-user-plus' }
  );

  return items;
});
</script>

<template>
  <div class="min-h-screen bg-default">
    <UHeader
      v-model:open="mobileMenuOpen"
      mode="drawer"
      :ui="{ root: 'sticky top-0 z-40 border-b border-default bg-default/90 backdrop-blur' }"
    >
      <template #title>
        <NuxtLink to="/" class="flex items-center gap-3">
          <AppLogo class="h-7 w-auto text-primary" />
          <div class="leading-none">
            <p class="font-semibold">Sehatku</p>
            <p class="text-xs text-muted">Booking dan antrean klinik</p>
          </div>
        </NuxtLink>
      </template>

      <template #right>
        <div class="hidden items-center gap-2 md:flex">
          <UButton
            v-for="link in navLinks.slice(0, 4)"
            :key="link.to"
            :to="link.to"
            :label="link.label"
            color="neutral"
            variant="ghost"
            :class="route.path === link.to ? 'text-primary' : ''"
          />
        </div>
        <UColorModeButton />
        <UserMenu />
      </template>

      <template #body>
        <div class="space-y-3 py-2">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="flex items-center gap-3 rounded-xl border border-default px-4 py-3 text-sm font-medium"
            @click="mobileMenuOpen = false"
          >
            <UIcon :name="link.icon" class="size-4" />
            <span>{{ link.label }}</span>
          </NuxtLink>
        </div>
      </template>
    </UHeader>

    <UMain>
      <UContainer class="py-6 sm:py-8">
        <slot />
      </UContainer>
    </UMain>

    <USeparator icon="i-lucide-heart-pulse" />

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">Sehatku • © {{ new Date().getFullYear() }}</p>
      </template>
      <template #right>
        <p class="text-sm text-muted">QR check-in • BLE thermal print</p>
      </template>
    </UFooter>
  </div>
</template>
