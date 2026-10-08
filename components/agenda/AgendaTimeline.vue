<script setup lang="ts">
import { eventKey, isTempEvent } from '~/composables/useAgenda'
import type { AgendaEvent } from '~/types/models'
import { eventEndMs, layoutTimeline } from '~/utils/agenda'

const props = withDefaults(defineProps<{
  events: AgendaEvent[]
  allDay?: AgendaEvent[]
  day: string
  now: Date
  today: string
  selectedId: string | null
  dayLabel: string
}>(), { allDay: () => [] })
const emit = defineEmits<{ select: [event: AgendaEvent] }>()

const HOUR_WIDTH = 120
const MIN_BLOCK_WIDTH = 120
const LANE_HEIGHT = 58
const LANE_GAP = 6
const RULER_HEIGHT = 28
const ALL_DAY_HEIGHT = 34
const ALL_DAY_GAP = 6

const scroller = ref<HTMLElement>()
const hours = Array.from({ length: 24 }, (_, h) => h)

const layout = computed(() => layoutTimeline(props.events, props.day, HOUR_WIDTH, MIN_BLOCK_WIDTH))
const totalWidth = 24 * HOUR_WIDTH
const bandHeight = computed(() => props.allDay.length * (ALL_DAY_HEIGHT + ALL_DAY_GAP) + (props.allDay.length ? 4 : 0))
const lanesTop = computed(() => RULER_HEIGHT + bandHeight.value)
const height = computed(() =>
  lanesTop.value + (layout.value.blocks.length ? layout.value.lanes * (LANE_HEIGHT + LANE_GAP) : 0) + 8,
)

const isToday = computed(() => props.day === props.today)
const nowLeft = computed(() => {
  const [h = 0, m = 0] = formatTime(props.now).split(':').map(Number)
  return ((h * 60 + m) / 60) * HOUR_WIDTH
})

const owner = useEventOwner()

function isPast(event: AgendaEvent) {
  return eventEndMs(event) < props.now.getTime()
}

/** Abre a linha do tempo uma hora antes de agora (hoje) ou do primeiro compromisso. */
function scrollToFocus() {
  const box = scroller.value
  if (!box) return
  const first = layout.value.blocks[0]
  const target = isToday.value ? nowLeft.value : first ? first.left : 8 * HOUR_WIDTH
  box.scrollTo({ left: Math.max(0, target - HOUR_WIDTH * 1.25), behavior: 'auto' })
}

onMounted(scrollToFocus)
watch(() => props.day, () => nextTick(scrollToFocus))
</script>

<template>
  <div
    ref="scroller"
    tabindex="0"
    role="region"
    :aria-label="`Linha do tempo de ${dayLabel}. Role para os lados para ver outros horários.`"
    class="scrollbar-accent overflow-x-auto overscroll-x-contain rounded-lg border bg-panel"
  >
    <div class="relative" :style="{ width: `${totalWidth}px`, height: `${height}px` }">
      <div
        v-for="hour in hours"
        :key="hour"
        class="absolute inset-y-0 border-l border-line"
        :class="hour === 0 && 'border-l-0'"
        :style="{ left: `${hour * HOUR_WIDTH}px` }"
        aria-hidden="true"
      >
        <span class="absolute left-1.5 top-1.5 text-xs font-medium tabular-nums text-ink-muted">{{ String(hour).padStart(2, '0') }}h</span>
      </div>

      <div
        v-if="isToday"
        class="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-accent"
        :style="{ left: `${nowLeft}px` }"
        aria-hidden="true"
      >
        <span class="absolute -left-[3px] top-0 size-2 rounded-full bg-accent" />
      </div>

      <ul v-if="allDay.length" class="contents" aria-label="Dia todo">
        <li
          v-for="(event, index) in allDay"
          :key="eventKey(event)"
          class="absolute z-10"
          :style="{
            left: '2px',
            width: `${totalWidth - 4}px`,
            top: `${RULER_HEIGHT + index * (ALL_DAY_HEIGHT + ALL_DAY_GAP)}px`,
            height: `${ALL_DAY_HEIGHT}px`,
          }"
        >
          <button
            type="button"
            class="flex size-full items-center rounded border text-left transition-colors"
            :class="selectedId === event.id
              ? 'border-action bg-action text-action-contrast'
              : 'border-accent/25 bg-accent-soft text-ink hover:border-accent'"
            :aria-pressed="selectedId === event.id"
            @click="emit('select', event)"
          >
            <span class="sticky left-2 inline-flex max-w-[28rem] items-center gap-2 px-2">
              <span class="shrink-0 text-xs font-semibold" :class="selectedId === event.id ? 'text-action-contrast' : 'text-accent'">Dia todo</span>
              <span class="truncate text-sm font-medium">{{ event.title }}</span>
              <span v-if="owner(event)" class="sr-only">, {{ owner(event)!.label }}</span>
            </span>
          </button>
        </li>
      </ul>

      <ul class="contents">
        <li
          v-for="block in layout.blocks"
          :key="eventKey(block.event)"
          class="absolute z-10"
          :style="{
            left: `${block.left + 2}px`,
            width: `${block.width - 4}px`,
            top: `${lanesTop + block.lane * (LANE_HEIGHT + LANE_GAP)}px`,
            height: `${LANE_HEIGHT}px`,
          }"
        >
          <button
            type="button"
            class="flex size-full items-center gap-2 overflow-hidden rounded border px-2 text-left transition-colors disabled:cursor-wait"
            :class="selectedId === block.event.id
              ? 'border-action bg-action text-action-contrast'
              : isPast(block.event)
                ? 'border-line bg-surface text-ink-muted hover:border-line-strong'
                : 'border-accent/25 bg-accent-soft text-ink hover:border-accent'"
            :aria-pressed="selectedId === block.event.id"
            :disabled="isTempEvent(block.event)"
            @click="emit('select', block.event)"
          >
            <UiAvatar
              v-if="owner(block.event)"
              :name="owner(block.event)!.name"
              :family="owner(block.event)!.family"
              size="sm"
              :class="selectedId === block.event.id && 'bg-panel'"
            />
            <span
              v-if="owner(block.event)?.more"
              class="-ml-1 shrink-0 text-xs font-semibold tabular-nums"
              :class="selectedId === block.event.id ? 'text-action-contrast' : 'text-accent'"
              aria-hidden="true"
            >+{{ owner(block.event)!.more }}</span>
            <span class="min-w-0 flex-1 leading-tight">
              <span class="block truncate text-[13px] tabular-nums" :class="selectedId === block.event.id ? 'text-action-contrast' : 'text-ink-muted'">
                {{ formatTime(new Date(block.event.starts_at)) }}
              </span>
              <span class="block truncate text-sm font-medium">{{ block.event.title }}</span>
            </span>
            <span v-if="owner(block.event)" class="sr-only">, {{ owner(block.event)!.label }}</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
