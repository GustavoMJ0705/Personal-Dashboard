<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{ icon: Component, text: string }>()
</script>

<template>
  <div class="flex items-center gap-4 rounded border border-dashed border-line-strong px-4 py-5">
    <span class="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink-subtle" aria-hidden="true">
      <component :is="icon" class="size-5" />
    </span>
    <div class="flex min-w-0 flex-1 flex-col items-start gap-2">
      <p class="text-base text-ink-muted">{{ text }}</p>
      <slot />
    </div>
  </div>
</template>
