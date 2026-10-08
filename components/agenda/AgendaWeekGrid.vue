<script setup lang="ts">
import { eventKey, isTempEvent } from '~/composables/useAgenda'
import type { AgendaEvent } from '~/types/models'
import { eventEndMs, eventsOnDay, layoutTimeline } from '~/utils/agenda'
import { civilToDate, zonedFormatter } from '~/utils/datetime'

const props = defineProps<{
  days: string[]
  events: AgendaEvent[]
  now: Date
  today: string
  selectedDay: string
  selectedId: string | null
  label: string
}>()
const emit = defineEmits<{ select: [event: AgendaEvent], pickDay: [day: string] }>()

// As 24 horas cabem na tela: a altura da hora acompanha o espaço que sobra abaixo do cabeçalho.
const MIN_HOUR_HEIGHT = 14
const MAX_HOUR_HEIGHT = 48
const BOTTOM_GAP = 24
const hours = Array.from({ length: 24 }, (_, h) => h)

const body = ref<HTMLElement>()
const hourHeight = ref(22)
const totalHeight = computed(() => 24 * hourHeight.value)
const showEveryHour = computed(() => hourHeight.value >= 22)

function fitToScreen() {
  const el = body.value
  if (!el) return
  const available = window.innerHeight - el.getBoundingClientRect().top - BOTTOM_GAP
  hourHeight.value = Math.max(MIN_HOUR_HEIGHT, Math.min(MAX_HOUR_HEIGHT, Math.floor(available / 24)))
}
const owner = useEventOwner()

const columns = computed(() => {
  const weekday = zonedFormatter('week-weekday', { weekday: 'short' })
  const full = zonedFormatter('week-full', { weekday: 'long', day: 'numeric', month: 'long' })
  return props.days.map((day) => {
    const all = eventsOnDay(props.events, day)
    const date = civilToDate(day)
    return {
      day,
      weekday: weekday.format(date).replace('.', ''),
      number: Number(day.slice(8)),
      label: full.format(date),
      allDay: all.filter((event) => event.all_day),
      blocks: layoutTimeline(all.filter((event) => !event.all_day), day, hourHeight.value, Math.max(16, hourHeight.value * 0.8)).blocks,
    }
  })
})
const hasAllDay = computed(() => columns.value.some((column) => column.allDay.length > 0))

const nowTop = computed(() => {
  const [h = 0, m = 0] = formatTime(props.now).split(':').map(Number)
  return ((h * 60 + m) / 60) * hourHeight.value
})

const isPast = (event: AgendaEvent) => eventEndMs(event) < props.now.getTime()

function blockStyle(block: { lane: number, groupLanes: number, left: number, width: number }) {
  const share = 100 / block.groupLanes
  return {
    top: `${block.left + 1}px`,
    height: `${block.width - 2}px`,
    left: `calc(${share * block.lane}% + 2px)`,
    width: `calc(${share}% - 4px)`,
  }
}

onMounted(() => {
  fitToScreen()
  window.addEventListener('resize', fitToScreen)
})
onBeforeUnmount(() => window.removeEventListener('resize', fitToScreen))
watch(() => props.events.some((event) => event.all_day), () => nextTick(fitToScreen))
</script>

<template>
  <section :aria-label="`Semana de ${label}`" class="overflow-hidden rounded-lg border bg-panel">
    <div class="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] border-b">
      <span aria-hidden="true" />
      <button
        v-for="column in columns"
        :key="column.day"
        type="button"
        class="flex flex-col items-center gap-0.5 border-l py-2 transition-colors hover:bg-surface"
        :class="column.day === selectedDay && 'bg-surface'"
        :aria-label="`Ver ${column.label}`"
        :aria-current="column.day === today ? 'date' : undefined"
        @click="emit('pickDay', column.day)"
      >
        <span class="text-xs font-medium" :class="column.day === today ? 'text-accent' : 'text-ink-muted'">{{ column.weekday }}</span>
        <span
          class="inline-flex size-8 items-center justify-center rounded-full font-display text-lg font-semibold tabular-nums"
          :class="column.day === today ? 'bg-action text-action-contrast' : 'text-ink'"
        >{{ column.number }}</span>
      </button>
    </div>

    <div v-if="hasAllDay" class="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] border-b">
      <span class="self-center px-1 text-[11px] font-medium leading-tight text-ink-muted">Dia todo</span>
      <div v-for="column in columns" :key="column.day" class="flex min-w-0 flex-col gap-1 border-l p-1">
        <button
          v-for="event in column.allDay"
          :key="eventKey(event)"
          type="button"
          class="truncate rounded-sm border px-1.5 py-0.5 text-left text-xs font-medium transition-colors"
          :class="selectedId === event.id
            ? 'border-action bg-action text-action-contrast'
            : 'border-accent/25 bg-accent-soft text-ink hover:border-accent'"
          :aria-pressed="selectedId === event.id"
          @click="emit('select', event)"
        >
          {{ event.title }}
        </button>
      </div>
    </div>

    <div ref="body" role="region" :aria-label="`Horários da semana de ${label}`">
      <div class="relative grid grid-cols-[3rem_repeat(7,minmax(0,1fr))]" :style="{ height: `${totalHeight}px` }">
        <div
          v-for="hour in hours"
          :key="hour"
          class="pointer-events-none absolute inset-x-0 border-t border-line"
          :class="hour === 0 && 'border-t-0'"
          :style="{ top: `${hour * hourHeight}px` }"
          aria-hidden="true"
        >
          <span
            v-if="showEveryHour || hour % 2 === 0"
            class="absolute left-1.5 top-0 text-[11px] font-medium leading-none tabular-nums text-ink-muted"
            :class="hourHeight >= 22 && 'top-0.5'"
          >{{ String(hour).padStart(2, '0') }}h</span>
        </div>

        <span aria-hidden="true" />
        <div
          v-for="column in columns"
          :key="column.day"
          class="relative border-l"
          :class="column.day === selectedDay && 'bg-surface/50'"
        >
          <div
            v-if="column.day === today"
            class="pointer-events-none absolute inset-x-0 z-20 h-0.5 -translate-y-1/2 bg-accent"
            :style="{ top: `${nowTop}px` }"
            aria-hidden="true"
          >
            <span class="absolute -left-1 -top-[3px] size-2 rounded-full bg-accent" />
          </div>

          <ul class="contents" :aria-label="column.label">
            <li v-for="block in column.blocks" :key="eventKey(block.event)" class="absolute z-10" :style="blockStyle(block)">
              <button
                type="button"
                class="flex size-full overflow-hidden rounded border px-1.5 text-left transition-colors disabled:cursor-wait"
                :class="[
                  block.width >= 34 ? 'flex-col py-0.5' : 'items-center gap-1',
                  selectedId === block.event.id
                    ? 'border-action bg-action text-action-contrast'
                    : isPast(block.event)
                      ? 'border-line bg-surface text-ink-muted hover:border-line-strong'
                      : 'border-accent/25 bg-accent-soft text-ink hover:border-accent',
                ]"
                :aria-pressed="selectedId === block.event.id"
                :disabled="isTempEvent(block.event)"
                @click="emit('select', block.event)"
              >
                <span class="shrink-0 truncate text-[11px] tabular-nums" :class="selectedId === block.event.id ? 'text-action-contrast' : 'text-ink-muted'">
                  {{ formatTime(new Date(block.event.starts_at)) }}
                </span>
                <span class="truncate text-xs font-medium leading-tight">{{ block.event.title }}</span>
                <span v-if="owner(block.event)" class="sr-only">, {{ owner(block.event)!.label }}</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>
