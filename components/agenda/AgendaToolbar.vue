<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import type { AgendaView } from '~/utils/agenda'

const props = defineProps<{
  view: AgendaView
  label: string
  showingToday: boolean
}>()
const emit = defineEmits<{ view: [view: AgendaView], move: [step: -1 | 1], today: [] }>()

const views: ReadonlyArray<{ key: AgendaView, label: string }> = [
  { key: 'day', label: 'Dia' },
  { key: 'week', label: 'Semana' },
]
const unit = computed(() => (props.view === 'week' ? 'semana' : 'dia'))
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div role="group" aria-label="Visão" class="inline-flex h-11 rounded border border-line-strong p-1">
        <button
          v-for="item in views"
          :key="item.key"
          type="button"
          class="rounded-sm px-4 text-[15px] font-medium transition-colors"
          :class="view === item.key ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:text-ink'"
          :aria-pressed="view === item.key"
          @click="emit('view', item.key)"
        >
          {{ item.label }}
        </button>
      </div>

      <div class="flex items-center gap-1">
        <UiButton variant="secondary" size="sm" :disabled="showingToday" @click="emit('today')">Hoje</UiButton>
        <button
          type="button"
          class="inline-flex size-10 items-center justify-center rounded text-ink-muted transition-colors hover:bg-surface hover:text-ink"
          :aria-label="`${unit === 'dia' ? 'Dia' : 'Semana'} anterior`"
          @click="emit('move', -1)"
        >
          <ChevronLeft class="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="inline-flex size-10 items-center justify-center rounded text-ink-muted transition-colors hover:bg-surface hover:text-ink"
          :aria-label="`Próxim${unit === 'dia' ? 'o dia' : 'a semana'}`"
          @click="emit('move', 1)"
        >
          <ChevronRight class="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>

    <p aria-live="polite" class="text-lg font-medium text-ink first-letter:uppercase">{{ label }}</p>
  </div>
</template>
