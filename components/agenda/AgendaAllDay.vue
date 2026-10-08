<script setup lang="ts">
import { eventKey } from '~/composables/useAgenda'
import type { AgendaEvent } from '~/types/models'

defineProps<{ events: AgendaEvent[], selectedId: string | null }>()
const emit = defineEmits<{ select: [event: AgendaEvent] }>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <span class="text-sm font-medium text-ink-muted">Dia todo</span>
    <button
      v-for="event in events"
      :key="eventKey(event)"
      type="button"
      class="inline-flex h-9 max-w-full items-center rounded-sm border px-3 text-sm font-medium transition-colors"
      :class="selectedId === event.id
        ? 'border-action bg-action text-action-contrast'
        : 'border-accent/25 bg-accent-soft text-ink hover:border-accent'"
      :aria-pressed="selectedId === event.id"
      @click="emit('select', event)"
    >
      <span class="truncate">{{ event.title }}</span>
    </button>
  </div>
</template>
