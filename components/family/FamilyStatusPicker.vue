<script setup lang="ts">
import type { MemberStatus } from '~/types/models'
import { STATUS_OPTIONS } from '~/utils/family'

const props = defineProps<{ current: MemberStatus | null, label?: string }>()
const emit = defineEmits<{ select: [status: MemberStatus | null] }>()
</script>

<template>
  <div role="group" :aria-label="props.label ?? 'Status'" class="flex flex-wrap gap-2">
    <button
      v-for="option in STATUS_OPTIONS"
      :key="option.value"
      type="button"
      class="inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-[15px] font-medium transition-colors"
      :class="props.current === option.value
        ? 'border-accent bg-accent-soft text-accent'
        : 'border-line-strong text-ink-muted hover:border-ink-subtle hover:text-ink'"
      :aria-pressed="props.current === option.value"
      @click="emit('select', props.current === option.value ? null : option.value)"
    >
      <component :is="option.icon" class="size-4" aria-hidden="true" />
      {{ option.label }}
    </button>
  </div>
</template>
