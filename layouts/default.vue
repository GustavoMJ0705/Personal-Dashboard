<script setup lang="ts">
const tasks = useTasks()
const family = useFamily()
const events = useEventsRealtime()

onMounted(() => {
  if (family.status.value === 'idle') void family.load()
  family.subscribe()
  tasks.subscribe()
  events.subscribe()
})
</script>

<template>
  <div class="min-h-dvh md:pl-rail">
    <a
      href="#conteudo"
      class="sr-only z-50 rounded bg-canvas px-4 py-2 text-sm font-medium text-accent focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
    >
      Pular para o conteúdo
    </a>

    <AppSideRail class="hidden md:flex" />
    <AppTopBar class="md:hidden" />

    <main
      id="conteudo"
      tabindex="-1"
      class="mx-auto w-full max-w-content px-5 pb-[calc(theme(spacing.tabbar)_+_env(safe-area-inset-bottom)_+_2rem)] pt-6 focus-visible:ring-0 md:px-12 md:pb-16 md:pt-16"
    >
      <slot />
    </main>

    <AppTabBar class="md:hidden" />
  </div>
</template>
