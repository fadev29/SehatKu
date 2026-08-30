<script setup lang="ts">
import { authClient } from "~~/lib/auth-client";

const session = authClient.useSession();
const route = useRoute();

const dashboardLink = { label: "Dashboard", to: "/admin", icon: "i-lucide-layout-dashboard" };

const navGroups = [
  {
    label: "Master Data",
    items: [
      { label: "Klinik", to: "/admin/klinik", icon: "i-lucide-briefcase-medical" },
      { label: "Dokter", to: "/admin/doctor", icon: "i-lucide-stethoscope" },
      { label: "Jadwal", to: "/admin/jadwal", icon: "i-lucide-calendar-days" },
      { label: "Pasien", to: "/admin/pasien", icon: "i-lucide-users" },
      { label: "Staf", to: "/admin/staff", icon: "i-lucide-id-card" }
    ]
  },
  {
    label: "Operasional",
    items: [
      { label: "Booking", to: "/admin/booking", icon: "i-lucide-ticket" },
      { label: "Antrean", to: "/admin/antrean", icon: "i-lucide-list-ordered" },
      { label: "Video Edukasi", to: "/admin/video-edukasi", icon: "i-lucide-monitor-play" }
    ]
  },
  {
    label: "Sistem",
    items: [
      { label: "Laporan", to: "/admin/riwayat", icon: "i-lucide-chart-column" },
      { label: "Pengaturan", to: "/admin/pengaturan", icon: "i-lucide-settings" }
    ]
  }
];

const pageTitleMap: Record<string, string> = {
  "/admin": "Overview",
  "/admin/klinik": "Manajemen Klinik",
  "/admin/doctor": "Manajemen Dokter",
  "/admin/jadwal": "Manajemen Jadwal",
  "/admin/pasien": "Data Pasien",
  "/admin/staff": "Manajemen Staf",
  "/admin/booking": "Manajemen Booking",
  "/admin/antrean": "Manajemen Antrean",
  "/admin/video-edukasi": "Manajemen Video Edukasi",
  "/admin/riwayat": "Laporan & Statistik",
  "/admin/pengaturan": "Pengaturan Sistem"
};

const pageTitle = computed(() => pageTitleMap[route.path] || "Admin");

function isActive(path: string) {
  return route.path === path;
}

function isGroupOpen(paths: string[]) {
  return paths.some((path) => route.path.startsWith(path));
}

async function handleLogout() {
  await authClient.signOut().catch(() => null);
  await navigateTo("/login");
}
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar class="border-e border-default bg-default/95 backdrop-blur">
      <template #header>
        <NuxtLink to="/admin" class="flex items-center gap-3">
          <AppLogo class="h-8 w-auto text-primary" />
          <div class="leading-none">
            <p class="font-semibold">Sehatku</p>
            <p class="text-xs text-muted">Manajemen Sistem</p>
          </div>
        </NuxtLink>
      </template>

      <div class="space-y-5 px-2 py-1">
        <NuxtLink
          :to="dashboardLink.to"
          class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition"
          :class="isActive(dashboardLink.to) ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'text-muted hover:bg-muted/50 hover:text-highlighted'"
        >
          <UIcon :name="dashboardLink.icon" class="size-4" />
          <span>{{ dashboardLink.label }}</span>
        </NuxtLink>

        <div v-for="group in navGroups" :key="group.label" class="space-y-2">
          <div class="px-3">
            <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              {{ group.label }}
            </p>
          </div>

          <div
            class="space-y-1 rounded-2xl border border-default/70 p-2 transition"
            :class="isGroupOpen(group.items.map((item) => item.to)) ? 'bg-muted/30' : 'bg-transparent'"
          >
            <NuxtLink
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition"
              :class="isActive(item.to) ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'text-muted hover:bg-muted/60 hover:text-highlighted'"
            >
              <UIcon :name="item.icon" class="size-4" />
              <span>{{ item.label }}</span>
              <span v-if="isActive(item.to)" class="ml-auto size-2 rounded-full bg-primary" />
            </NuxtLink>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="space-y-3 p-2">
          <div class="rounded-xl border border-default p-3 text-sm">
            <div class="flex items-center gap-3">
              <UAvatar :src="session.data?.user?.image || undefined" :alt="session.data?.user?.name || 'Admin'" size="sm" class="shrink-0" :ui="{ root: 'rounded-full overflow-hidden', image: 'object-cover' }" />
              <div class="min-w-0">
                <p class="font-medium">{{ session.data?.user?.name || "Admin" }}</p>
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
          <div class="flex items-center gap-3">
            <UButton color="neutral" variant="ghost" icon="i-lucide-bell" aria-label="Notifikasi" />
            <div class="flex items-center gap-2">
              <UBadge color="primary" variant="subtle">admin</UBadge>
              <UAvatar :src="session.data?.user?.image || undefined" :alt="session.data?.user?.name || 'SA'" size="sm" class="shrink-0" :ui="{ root: 'rounded-full overflow-hidden', image: 'object-cover' }" />
            </div>
          </div>
        </template>
      </UDashboardNavbar>

      <div class="max-h-[calc(100vh-64px)] flex-1 overflow-y-auto p-4 sm:p-6">
        <div class="mb-6 rounded-2xl border border-default bg-default p-5 shadow-sm">
          <p class="text-sm text-muted">Sehatku</p>
          <h1 class="text-2xl font-semibold">{{ pageTitle }}</h1>
          <p class="mt-1 text-sm text-muted">Panel admin pakai shell lama. Isi halaman ikut contoh menu referensi.</p>
        </div>
        <slot />
      </div>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
