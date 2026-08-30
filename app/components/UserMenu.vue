<script setup lang="ts">
import { authClient } from "~~/lib/auth-client";
const loading = ref(false);
const session = authClient.useSession();

const userName = computed(() => session.value?.data?.user?.name || "Akun");
const userEmail = computed(() => session.value?.data?.user?.email || "Belum login");
const isLoggedIn = computed(() => Boolean(session.value?.data?.user));
const userImage = computed(() => session.value?.data?.user?.image || undefined);

async function logout() {
  loading.value = true;
  await authClient.signOut().catch(() => null);
  await session.value?.refetch?.().catch(() => null);
  loading.value = false;
  await navigateTo("/login");
}

const items = computed(() => {
  if (!isLoggedIn.value) {
    return [[
      { label: "Masuk", icon: "i-lucide-log-in", to: "/login" },
      { label: "Daftar", icon: "i-lucide-user-plus", to: "/register" }
    ]];
  }

  return [[
    { label: "Profil", icon: "i-lucide-user-round", to: "/profile" }
  ], [
    { label: "Keluar", icon: "i-lucide-log-out", onSelect: logout }
  ]];
});
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'end' }">
    <UButton color="neutral" variant="ghost" :loading="loading || session.isPending" class="rounded-full">
      <UAvatar :src="userImage" :alt="userName" size="sm" class="shrink-0" :ui="{ root: 'rounded-full overflow-hidden', image: 'object-cover' }" />
      <span class="hidden text-left sm:block">
        <span class="block text-xs font-medium leading-none">{{ userName }}</span>
        <span class="mt-1 block text-[11px] leading-none text-muted">{{ userEmail }}</span>
      </span>
    </UButton>
  </UDropdownMenu>
</template>
