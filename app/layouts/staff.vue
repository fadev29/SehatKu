<script setup lang="ts">
import { authClient } from "~~/lib/auth-client";

const session = authClient.useSession();
const route = useRoute();

const links = [
  { label: "Dashboard", to: "/staff", icon: "i-lucide-layout-dashboard" },
  {
    label: "Operasional",
    icon: "i-lucide-clipboard-list",
    children: [
      { label: "Bluetooth Printer", to: "/staff/bluetooth", icon: "i-lucide-bluetooth" }
    ]
  }
];

const pageTitleMap: Record<string, string> = {
  "/staff": "Dashboard",
  "/staff/bluetooth": "Bluetooth Printer"
};

const pageTitle = computed(() => pageTitleMap[route.path] || "Staff");

async function handleLogout() {
  await authClient.signOut().catch(() => null);
  await navigateTo("/login");
}
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar class="border-e border-default bg-default/95 backdrop-blur">
      <template #header>
        <NuxtLink to="/staff" class="flex items-center gap-3">
          <AppLogo class="h-8 w-auto text-primary" />
          <div class="leading-none">
            <p class="font-semibold">Sehatku</p>
            <p class="text-xs text-muted">Panel Staff</p>
          </div>
        </NuxtLink>
      </template>

      <UNavigationMenu orientation="vertical" :items="links" />

      <template #footer>
        <div class="space-y-3 p-2">
          <div class="rounded-xl border border-default p-3 text-sm">
            <div class="flex items-center gap-3">
              <UAvatar :src="session.data?.user?.image || undefined" :alt="session.data?.user?.name || 'Staff'" size="sm" class="shrink-0" :ui="{ root: 'rounded-full overflow-hidden', image: 'object-cover' }" />
              <div class="min-w-0">
                <p class="font-medium">{{ session.data?.user?.name || "Staff" }}</p>
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
            <UBadge color="warning" variant="subtle">staff</UBadge>
            <UColorModeButton />
          </div>
        </template>
      </UDashboardNavbar>

      <div class="max-h-[calc(100vh-64px)] flex-1 overflow-y-auto p-4 sm:p-6">
        <div class="mb-6 rounded-2xl border border-default bg-default p-5 shadow-sm">
          <p class="text-sm text-muted">Sehatku</p>
          <h1 class="text-2xl font-semibold">{{ pageTitle }}</h1>
          <p class="mt-1 text-sm text-muted">Kelola check-in pasien, sambungan printer bluetooth, dan cetak tiket antrean.</p>
        </div>
        <slot />
      </div>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
