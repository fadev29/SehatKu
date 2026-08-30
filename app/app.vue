<script setup lang="ts">
const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl
const title = 'Sehatku'
const description = 'Sistem booking klinik, check-in QR, antrean realtime, monitor panggilan, dan print tiket thermal.'
const ogImage = `${siteUrl}/sehatku.webp`

useHead({
  titleTemplate: (pageTitle) => pageTitle ? `${pageTitle} · ${title}` : title,
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'theme-color', content: '#0D9488' },
    { name: 'apple-mobile-web-app-title', content: title }
  ],
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/sehatku.ico' },
    { rel: 'shortcut icon', href: '/sehatku.ico' },
    { rel: 'apple-touch-icon', href: '/sehatku_logo.webp' }
  ],
  htmlAttrs: {
    lang: 'id'
  }
})

useSeoMeta({
  title,
  description,
  applicationName: title,
  author: 'Sehatku',
  generator: 'Nuxt 4',
  robots: 'index, follow',
  googlebot: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogSiteName: title,
  ogLocale: 'id_ID',
  ogUrl: siteUrl,
  ogImage,
  twitterCard: 'summary_large_image'
  ,twitterTitle: title,
  twitterDescription: description,
  twitterImage: ogImage
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<style>
.admin-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.admin-hero {
  border: 1px solid rgb(var(--ui-border));
  border-radius: 1rem;
  background: rgb(var(--ui-bg));
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.admin-hero h1 {
  font-size: 2rem;
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.admin-hero p {
  margin-top: 0.35rem;
  color: rgb(var(--ui-text-muted));
}

.admin-toolbar-card,
.admin-table-card,
.admin-stats-card {
  border-radius: 1rem;
  border: 1px solid rgb(var(--ui-border));
  background: rgb(var(--ui-bg));
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.admin-toolbar-card {
  padding: 1rem;
}

.admin-table-card {
  overflow: hidden;
}

.admin-stats-card {
  padding: 1.25rem;
}

.admin-table-card table thead {
  background: rgb(var(--ui-bg-elevated) / 0.65);
}

.admin-table-card table th,
.admin-table-card table td {
  padding: 1rem 1.5rem;
}

.admin-table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-top: 1px solid rgb(var(--ui-border));
  padding: 1rem 1.5rem;
  color: rgb(var(--ui-text-muted));
  font-size: 0.875rem;
}

.admin-soft-panel {
  border: 1px solid rgb(var(--ui-border));
  border-radius: 1rem;
  background: rgb(var(--ui-bg));
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}
</style>
