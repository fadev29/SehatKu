<script setup lang="ts">
const items = [[
  { label: "Beranda", icon: "i-lucide-house", to: "/" },
  { label: "Booking", icon: "i-lucide-calendar-days", to: "/booking" },
  { label: "Login", icon: "i-lucide-log-in", to: "/login" },
  { label: "Daftar", icon: "i-lucide-user-plus", to: "/register" }
]];
</script>

<template>
  <UDropdownMenu v-slot="{ open }" :modal="false" :items="items" :content="{ align: 'start' }" :ui="{ content: 'min-w-52' }" size="xs">
    <UButton
      label="Menu"
      variant="subtle"
      trailing-icon="i-lucide-chevron-down"
      size="xs"
      class="-mb-[6px] rounded-full font-semibold"
      :class="[open && 'bg-primary/15']"
      :ui="{
        trailingIcon: ['transition-transform duration-200', open ? 'rotate-180' : undefined].filter(Boolean).join(' ')
      }"
    />
  </UDropdownMenu>
</template>
