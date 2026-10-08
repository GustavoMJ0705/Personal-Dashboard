<script setup lang="ts">
import type { AgendaEvent } from '~/types/models'
import { eventsOnDay } from '~/utils/agenda'

const props = defineProps<{ days: string[], events: AgendaEvent[], today: string, now: Date, selectedId: string | null }>()
const emit = defineEmits<{ select: [event: AgendaEvent] }>()

const sections = computed(() => props.days.map((day) => ({ day, events: eventsOnDay(props.events, day) })))
</script>

<template>
  <div class="flex flex-col gap-5">
    <section v-for="section in sections" :key="section.day" :aria-labelledby="`semana-${section.day}`">
      <h3 :id="`semana-${section.day}`" class="mb-1.5 flex items-center gap-2 text-[15px] font-semibold" :class="section.day === today ? 'text-accent' : 'text-ink'">
        <span class="first-letter:uppercase">{{ formatLongDate(civilToDate(section.day)) }}</span>
        <span v-if="section.day === today" class="rounded-sm bg-accent-soft px-1.5 text-[13px] font-medium text-accent">Hoje</span>
      </h3>
      <p v-if="section.events.length === 0" class="text-sm text-ink-muted">Livre.</p>
      <AgendaDayList v-else class="-mx-1" :events="section.events" :selected-id="selectedId" :now="now" @select="emit('select', $event)" />
    </section>
  </div>
</template>
