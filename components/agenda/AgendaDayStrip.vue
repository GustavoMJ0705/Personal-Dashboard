<script setup lang="ts">
import { addDaysToCivilDate, civilToDate, zonedFormatter } from '~/utils/datetime'

const props = defineProps<{
  days: string[]
  selected: string
  today: string
  busy: Set<string>
}>()
const emit = defineEmits<{ select: [day: string], 'reach-start': [], 'reach-end': [] }>()

const scroller = ref<HTMLElement>()
const buttons = new Map<string, HTMLButtonElement>()


const items = computed(() => {
  const weekdayFormatter = zonedFormatter('strip-weekday', { weekday: 'short' })
  const monthFormatter = zonedFormatter('strip-month', { month: 'short' })
  const fullFormatter = zonedFormatter('strip-full', { weekday: 'long', day: 'numeric', month: 'long' })
  return props.days.map((day) => {
    const date = civilToDate(day)
    const dayOfMonth = Number(day.slice(8))
    return {
      day,
      number: dayOfMonth,
      weekday: weekdayFormatter.format(date).replace('.', ''),
      month: dayOfMonth === 1 ? monthFormatter.format(date).replace('.', '') : null,
      label: fullFormatter.format(date),
    }
  })
})

function setButton(day: string, el: unknown) {
  if (el instanceof HTMLButtonElement) buttons.set(day, el)
  else buttons.delete(day)
}

const reduceMotion = () => import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function center(day: string, smooth = true) {
  const el = buttons.get(day)
  const box = scroller.value
  if (!el || !box) return
  const left = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2
  box.scrollTo({ left, behavior: smooth && !reduceMotion() ? 'smooth' : 'auto' })
}

let edgeLock = false
function onScroll() {
  const box = scroller.value
  if (!box || edgeLock) return
  const threshold = 160
  if (box.scrollLeft < threshold) {
    edgeLock = true
    const before = box.scrollWidth
    emit('reach-start')
    nextTick(() => {
      box.scrollLeft += box.scrollWidth - before
      edgeLock = false
    })
  } else if (box.scrollLeft + box.clientWidth > box.scrollWidth - threshold) {
    edgeLock = true
    emit('reach-end')
    nextTick(() => {
      edgeLock = false
    })
  }
}

function onKeydown(event: KeyboardEvent) {
  const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
  if (!step) return
  event.preventDefault()
  const next = addDaysToCivilDate(props.selected, step)
  emit('select', next)
  nextTick(() => {
    buttons.get(next)?.focus({ preventScroll: true })
    center(next)
  })
}

onMounted(() => center(props.selected, false))
watch(() => props.selected, (day) => nextTick(() => center(day)))

defineExpose({ center })
</script>

<template>
  <div
    ref="scroller"
    class="relative -mx-5 overflow-x-auto overscroll-x-contain px-5 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden"
    @scroll.passive="onScroll"
  >
    <ul class="flex w-max snap-x snap-mandatory gap-1.5 py-1" aria-label="Dias" @keydown="onKeydown">
      <li v-for="item in items" :key="item.day" class="snap-center">
        <button
          :ref="(el) => setButton(item.day, el)"
          type="button"
          class="relative flex h-[4.25rem] w-12 flex-col items-center justify-center rounded transition-colors"
          :class="item.day === selected
            ? 'bg-action text-action-contrast'
            : item.day === today
              ? 'text-accent hover:bg-accent-soft'
              : 'text-ink hover:bg-surface'"
          :tabindex="item.day === selected ? 0 : -1"
          :aria-pressed="item.day === selected"
          :aria-label="`${item.label}${item.day === today ? ', hoje' : ''}${busy.has(item.day) ? ', com compromissos' : ''}`"
          @click="emit('select', item.day)"
        >
          <span
            class="text-[13px] font-medium"
            :class="item.day === selected ? 'text-action-contrast' : item.month ? 'text-accent' : 'text-ink-muted'"
          >{{ item.month ?? item.weekday }}</span>
          <span class="font-display text-xl font-semibold leading-tight tabular-nums">{{ item.number }}</span>
          <span
            class="mt-0.5 size-1 rounded-full"
            :class="busy.has(item.day) ? (item.day === selected ? 'bg-action-contrast' : 'bg-accent') : 'bg-transparent'"
            aria-hidden="true"
          />
        </button>
      </li>
    </ul>
  </div>
</template>
