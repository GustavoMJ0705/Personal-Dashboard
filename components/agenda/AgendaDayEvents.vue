<script setup lang="ts">
import { eventKey } from '~/composables/useAgenda'
import type { AgendaEvent } from '~/types/models'

defineProps<{
  day: string
  events: AgendaEvent[]
  emptyText: string
  label?: string
}>()

const editingId = defineModel<string | null>('editingId', { default: null })
</script>

<template>
  <p v-if="events.length === 0" class="py-3 text-base text-ink-muted">{{ emptyText }}</p>
  <ul v-else :aria-label="label" class="divide-y divide-line border-y">
    <EventItem
      v-for="event in events"
      :key="eventKey(event)"
      :event="event"
      :day="day"
      :editing="editingId === `${day}:${event.id}`"
      @edit="editingId = `${day}:${event.id}`"
      @close="editingId = null"
    />
  </ul>
</template>
