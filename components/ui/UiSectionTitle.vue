<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{ id: string, title: string, icon: Component, count?: number | null }>()
</script>

<template>
  <div class="flex items-center justify-between gap-4">
    <h2 :id="id" class="flex items-center gap-3 text-lg font-semibold text-ink">
      <span class="inline-flex size-8 shrink-0 items-center justify-center rounded bg-accent-soft text-accent" aria-hidden="true">
        <component :is="icon" class="size-[1.125rem]" :stroke-width="2" />
      </span>
      {{ title }}
      <span v-if="count !== undefined && count !== null" class="text-base font-normal tabular-nums text-ink-muted">{{ count }}</span>
    </h2>
    <div class="shrink-0 whitespace-nowrap">
      <slot name="action" />
    </div>
  </div>
</template>
