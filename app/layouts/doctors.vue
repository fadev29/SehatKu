<script setup lang="ts">
import { authClient } from "~~/lib/auth-client";

const session = authClient.useSession();
const route = useRoute();

const links = [
  { label: "Dashboard", to: "/doctor", icon: "i-lucide-layout-dashboard" },
  {
    label: "Operasional",
    icon: "i-lucide-stethoscope",
    children: [
      { label: "Jadwal", to: "/doctor/schedule", icon: "i-lucide-calendar-days" }
    ]
  }
];

const pageTitleMap: Record<string, string> = {
  "/doctor": "Dashboard",
  "/doctor/schedule": "Jadwal"
};

const pageTitle = computed(() => pageTitleMap[route.path] || "Dokter");

async function handleLogout() {
  await authClient.signOut().catch(() => null);
  await navigateTo("/login");
}
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar class="border-e border-default bg-default/95 backdrop-blur">
      <template #header>
        <NuxtLink to="/doctor" class="flex items-center gap-3">
          <AppLogo class="h-8 w-auto text-primary" />
          <div class="leading-none">
            <p class="font-semibold">Sehatku</p>
            <p class="text-xs text-muted">Panel Dokter</p>
          </div>
        </NuxtLink>
      </template>

      <UNavigationMenu orientation="vertical" :items="links" />

      <template #footer>
        <div class="space-y-3 p-2">
          <div class="rounded-xl border border-default p-3 text-sm">
            <div class="flex items-center gap-3">
              <UAvatar :src="session.data?.user?.image || undefined" :alt="session.data?.user?.name || 'Dokter'" size="sm" class="shrink-0" :ui="{ root: 'rounded-full overflow-hidden', image: 'object-cover' }" />
              <div class="min-w-0">
                <p class="font-medium">{{ session.data?.user?.name || "Dokter" }}</p>
                <p class="truncate text-muted">{{ session.data?.user?.email || "Belum login" }}</p>
              </div>
            </div>
          </div>
          <UButton label="Beranda" icon="i-lucide-house" variant="ghost" color="neutral" to="/" block />
          <UButton label="Keluar" icon="i-lucide-log-out" color="error" variant="ghost" block @click="handleLogout" />
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel class="bg-transparent">
      <UDashboardNavbar :title="pageTitle" class="border-b border-default bg-default/90 backdrop-blur">
        <template #right>
          <div class="flex items-center gap-2">
            <UBadge color="success" variant="subtle">doctor</UBadge>
            <UColorModeButton />
          </div>
        </template>
      </UDashboardNavbar>

      <div class="max-h-[calc(100vh-64px)] flex-1 overflow-y-auto p-4 sm:p-6">
        <div class="mb-6 rounded-2xl border border-default bg-default p-5 shadow-sm">
          <p class="text-sm text-muted">Sehatku</p>
          <h1 class="text-2xl font-semibold">{{ pageTitle }}</h1>
          <p class="mt-1 text-sm text-muted">Lihat antrean hari ini, panggil pasien, skip, dan selesaikan layanan.</p>
        </div>
        <slot />
      </div>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
