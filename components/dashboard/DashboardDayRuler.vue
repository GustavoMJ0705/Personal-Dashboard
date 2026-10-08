<script setup lang="ts">
import type { AgendaEvent } from '~/types/models'
import { minutesOnDay } from '~/utils/agenda'

const props = defineProps<{ now: Date, today: string, events: AgendaEvent[] }>()

const DAY = 24 * 60
const TICKS = [0, 6, 12, 18, 24]

const elapsed = computed(() => {
  const [h = 0, m = 0] = formatTime(props.now).split(':').map(Number)
  return h * 60 + m
})
const percent = computed(() => (elapsed.value / DAY) * 100)

const marks = computed(() =>
  props.events
    .filter((event) => !event.all_day)
    .map((event) => {
      const { start, end } = minutesOnDay(event, props.today)
      return { id: event.id, left: (start / DAY) * 100, width: ((end - start) / DAY) * 100, past: end <= elapsed.value }
    }),
)

const label = computed(() => {
  const n = marks.value.length
  const events = n === 0 ? 'sem compromissos com hora' : `${n} ${n === 1 ? 'compromisso' : 'compromissos'} com hora`
  return `Seu dia: ${Math.round(percent.value)}% já passou, ${events}.`
})
</script>

<template>
  <div role="img" :aria-label="label" class="max-w-[34rem]">
    <div class="relative h-2.5 rounded-full bg-surface-strong">
      <div class="absolute inset-y-0 left-0 rounded-full bg-line-strong" :style="{ width: `${percent}%` }" />
      <span
        v-for="mark in marks"
        :key="mark.id"
        class="absolute inset-y-0 min-w-1.5 rounded-full"
        :class="mark.past ? 'bg-accent/40' : 'bg-accent'"
        :style="{ left: `${mark.left}%`, width: `${mark.width}%` }"
      />
      <span
        class="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-ink bg-panel"
        :style="{ left: `${percent}%` }"
      />
    </div>
    <div class="relative mt-2 h-4 text-xs tabular-nums text-ink-muted" aria-hidden="true">
      <span
        v-for="tick in TICKS"
        :key="tick"
        class="absolute"
        :class="tick === 0 ? 'left-0' : tick === 24 ? 'right-0' : '-translate-x-1/2'"
        :style="tick === 0 || tick === 24 ? undefined : { left: `${(tick / 24) * 100}%` }"
      >{{ tick }}h</span>
    </div>
  </div>
</template>
