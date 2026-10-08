<script setup lang="ts">
import { Monitor, Moon, Sun } from 'lucide-vue-next'
import type { ThemePreference } from '~/composables/useTheme'

const props = withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

const { preference, set } = useTheme()

const options: ReadonlyArray<{ value: ThemePreference, label: string, icon: typeof Sun }> = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Automático', icon: Monitor },
]
</script>

<template>
  <div role="group" aria-label="Tema" class="flex rounded border border-line bg-surface p-0.5">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="inline-flex items-center justify-center gap-1.5 rounded-sm text-sm font-medium transition-colors"
      :class="[
        props.compact ? 'size-9' : 'h-8 flex-1 px-2',
        preference === option.value ? 'bg-panel text-ink shadow-overlay' : 'text-ink-muted hover:text-ink',
      ]"
      :aria-pressed="preference === option.value"
      :aria-label="props.compact ? `Tema ${option.label.toLowerCase()}` : undefined"
      :title="option.label"
      @click="set(option.value)"
    >
      <component :is="option.icon" class="size-4" aria-hidden="true" />
      <span v-if="!props.compact">{{ option.label }}</span>
    </button>
  </div>
</template>
