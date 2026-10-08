<script setup lang="ts">
import type { AgendaFilter } from '~/utils/agenda'

defineProps<{ filter: AgendaFilter }>()
const emit = defineEmits<{ change: [filter: AgendaFilter] }>()

const { others } = useFamily()

const options = computed<Array<{ value: AgendaFilter, label: string }>>(() => [
  { value: 'all', label: 'Todos' },
  { value: 'me', label: 'Eu' },
  ...others.value.map((m) => ({ value: `member:${m.user_id}` as AgendaFilter, label: m.display_name })),
  { value: 'family', label: 'Família' },
])
</script>

<template>
  <div class="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
    <div role="group" aria-label="Mostrar compromissos de" class="flex w-max gap-1.5 md:mx-auto">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="h-9 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors"
        :class="filter === option.value
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-line-strong text-ink-muted hover:border-ink-subtle hover:text-ink'"
        :aria-pressed="filter === option.value"
        @click="emit('change', option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
