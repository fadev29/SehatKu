<script setup lang="ts">
import { z } from "zod";
import { authClient } from "~~/lib/auth-client";
import type { FormSubmitEvent, AuthFormField } from "@nuxt/ui";

const errorMsg = ref("");
const loading = ref(false);

const fields: AuthFormField[] = [
  {
    name: "name",
    type: "text",
    label: "Nama lengkap",
    placeholder: "Masukkan nama lengkap",
    required: true
  },
  {
    name: "email",
    type: "email",
    label: "Email",
    placeholder: "nama@email.com",
    required: true
  },
  {
    name: "password",
    type: "password",
    label: "Password",
    placeholder: "Minimal 8 karakter",
    required: true
  }
];

const schema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter")
});

type Schema = z.output<typeof schema>;

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;
  errorMsg.value = "";

  const result = await authClient.signUp.email({
    name: event.data.name,
    email: event.data.email,
    password: event.data.password
  });

  loading.value = false;

  if (result.error) {
    errorMsg.value = result.error.message ?? "Registrasi gagal";
    return;
  }

  await navigateTo("/login?registered=1");
}
</script>

<template>
  <div class="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-10">
    <UPageCard class="w-full max-w-md">
      <UAuthForm
        :schema="schema"
        :fields="fields"
        title="Daftar Akun Sehatku"
        description="Buat akun pasien untuk booking jadwal dan check-in lebih cepat."
        icon="i-lucide-user-plus"
        :submit="{ label: 'Daftar', loading, block: true }"
        @submit="onSubmit"
      >
        <template #footer>
          <p class="text-center text-sm text-muted">
            Sudah punya akun?
            <NuxtLink to="/login" class="text-primary font-medium">
              Masuk di sini
            </NuxtLink>
          </p>
        </template>
      </UAuthForm>

      <p v-if="errorMsg" class="mt-4 text-center text-sm text-error">
        {{ errorMsg }}
      </p>
    </UPageCard>
  </div>
</template>
