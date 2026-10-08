<script setup lang="ts">
import { eventKey, isTempEvent } from '~/composables/useAgenda'
import type { AgendaEvent } from '~/types/models'
import { layoutTimeline } from '~/utils/agenda'

const props = defineProps<{
  events: AgendaEvent[]
  day: string
  now: Date
  today: string
  selectedId: string | null
  dayLabel: string
}>()
const emit = defineEmits<{ select: [event: AgendaEvent] }>()

const HOUR_HEIGHT = 64
const MIN_BLOCK_HEIGHT = 44
const GUTTER = '3rem'

const scroller = ref<HTMLElement>()
const hours = Array.from({ length: 24 }, (_, h) => h)
const totalHeight = 24 * HOUR_HEIGHT

const layout = computed(() => layoutTimeline(props.events, props.day, HOUR_HEIGHT, MIN_BLOCK_HEIGHT))
const owner = useEventOwner()

const isToday = computed(() => props.day === props.today)
const nowTop = computed(() => {
  const [h = 0, m = 0] = formatTime(props.now).split(':').map(Number)
  return ((h * 60 + m) / 60) * HOUR_HEIGHT
})

const isPast = (event: AgendaEvent) => Date.parse(event.ends_at) < props.now.getTime()
const compact = (height: number) => height < 56

function blockStyle(block: { lane: number, groupLanes: number, left: number, width: number }) {
  const share = `(100% - ${GUTTER}) / ${block.groupLanes}`
  return {
    top: `${block.left + 1}px`,
    height: `${block.width - 2}px`,
    left: `calc(${GUTTER} + ${share} * ${block.lane})`,
    width: `calc(${share} - 4px)`,
  }
}

/** Abre a coluna uma hora antes de agora (hoje) ou do primeiro compromisso. */
function scrollToFocus() {
  const box = scroller.value
  if (!box) return
  const first = layout.value.blocks[0]
  const target = isToday.value ? nowTop.value : first ? first.left : 8 * HOUR_HEIGHT
  box.scrollTo({ top: Math.max(0, target - HOUR_HEIGHT * 1.25), behavior: 'auto' })
}

onMounted(scrollToFocus)
watch(() => props.day, () => nextTick(scrollToFocus))
</script>

<template>
  <div
    ref="scroller"
    tabindex="0"
    role="region"
    :aria-label="`Linha do tempo de ${dayLabel}. Role para cima e para baixo para ver outros horários.`"
    class="max-h-[min(34rem,62dvh)] overflow-y-auto overscroll-y-contain rounded-lg border bg-panel"
  >
    <div class="relative" :style="{ height: `${totalHeight}px` }">
      <div
        v-for="hour in hours"
        :key="hour"
        class="absolute inset-x-0 border-t border-line"
        :class="hour === 0 && 'border-t-0'"
        :style="{ top: `${hour * HOUR_HEIGHT}px` }"
        aria-hidden="true"
      >
        <span class="absolute left-2 top-1 text-xs font-medium tabular-nums text-ink-muted">{{ String(hour).padStart(2, '0') }}h</span>
      </div>

      <div
        v-if="isToday"
        class="pointer-events-none absolute right-0 h-0.5 -translate-y-1/2 bg-accent"
        :style="{ top: `${nowTop}px`, left: GUTTER }"
        aria-hidden="true"
      >
        <span class="absolute -left-1 -top-[3px] size-2 rounded-full bg-accent" />
      </div>

      <ul class="contents">
        <li
          v-for="block in layout.blocks"
          :key="eventKey(block.event)"
          class="absolute z-10 pl-1"
          :style="blockStyle(block)"
        >
          <button
            type="button"
            class="flex size-full gap-2 overflow-hidden rounded border px-2 text-left transition-colors disabled:cursor-wait"
            :class="[
              compact(block.width) ? 'items-center' : 'items-start py-1.5',
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
            <UiAvatar
              v-if="owner(block.event) && block.groupLanes < 3"
              :name="owner(block.event)!.name"
              :family="owner(block.event)!.family"
              size="sm"
              :class="selectedId === block.event.id && 'bg-panel'"
            />
            <span class="min-w-0 flex-1 leading-tight">
              <span
                class="truncate text-[13px] tabular-nums"
                :class="[compact(block.width) ? 'mr-1.5 inline' : 'block', selectedId === block.event.id ? 'text-action-contrast' : 'text-ink-muted']"
              >{{ formatTime(new Date(block.event.starts_at)) }}</span>
              <span class="text-sm font-medium" :class="compact(block.width) ? 'inline' : 'line-clamp-2 break-words'">{{ block.event.title }}</span>
            </span>
            <span v-if="owner(block.event)" class="sr-only">, {{ owner(block.event)!.label }}</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
