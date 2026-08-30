<script setup lang="ts">
import { z } from "zod";
import { authClient } from "~~/lib/auth-client";
import { getHomeByRole } from "~~/app/utils/auth";
import type { FormSubmitEvent, AuthFormField } from "@nuxt/ui";

const route = useRoute();
const errorMsg = ref("");
const loading = ref(false);

const fields: AuthFormField[] = [
  {
    name: "email",
    type: "email",
    label: "Email",
    placeholder: "nama@email.com",
    required: true,
  },
  {
    name: "password",
    type: "password",
    label: "Password",
    placeholder: "Masukkan password",
    required: true,
  },
];

const schema = z.object({
  email: z.email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

type Schema = z.output<typeof schema>;

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;
  errorMsg.value = "";

  const result = await authClient.signIn.email({
    email: event.data.email,
    password: event.data.password,
  });

  if (result.error) {
    loading.value = false;
    errorMsg.value = result.error.message ?? "Login gagal";
    return;
  }

  const session = await authClient.getSession();
  await refreshNuxtData();
  loading.value = false;

  const redirect =
    typeof route.query.redirect === "string" ? route.query.redirect : undefined;

  await navigateTo(redirect || getHomeByRole(session.data?.user?.role));
}
</script>

<template>
  <div
    class="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-10"
  >
    <UPageCard class="w-full max-w-md">
      <UAuthForm
        :schema="schema"
        :fields="fields"
        title="Masuk ke Sehatku"
        description="Login untuk booking, check-in, dan kelola antrean klinik."
        icon="i-lucide-lock"
        :submit="{ label: 'Masuk', loading, block: true }"
        @submit="onSubmit"
      >
        <template #footer>
          <div class="space-y-3 text-center">
            <UAlert
              v-if="route.query.registered === '1'"
              color="success"
              variant="subtle"
              title="Registrasi berhasil"
              description="Akun sudah dibuat. Silakan login."
            />

            <p class="text-sm text-muted">
              Belum punya akun?
              <NuxtLink to="/register" class="text-primary font-medium">
                Daftar di sini
              </NuxtLink>
            </p>
          </div>
        </template>
      </UAuthForm>

      <p v-if="errorMsg" class="mt-4 text-center text-sm text-error">
        {{ errorMsg }}
      </p>
    </UPageCard>
  </div>
</template>
