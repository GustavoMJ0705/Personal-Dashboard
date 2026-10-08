<script setup lang="ts">
useHead({
  titleTemplate: (title) => (title ? `${title} | Misumoto` : 'Misumoto'),
})
</script>

<template>
  <div>
    <NuxtLoadingIndicator color="rgb(var(--color-accent))" :height="2" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <UiToaster />
  </div>
</template>
