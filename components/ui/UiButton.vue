<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost'
    size?: 'md' | 'sm'
    type?: 'button' | 'submit'
    loading?: boolean
    disabled?: boolean
  }>(),
  { variant: 'primary', size: 'md', type: 'button', loading: false, disabled: false },
)

const variantClass = {
  'primary': 'bg-action text-action-contrast hover:bg-action-hover',
  'secondary': 'border border-line-strong bg-canvas text-ink hover:bg-surface',
  'ghost': 'text-ink-muted hover:bg-surface-strong hover:text-ink',
  'danger': 'bg-danger text-accent-contrast hover:bg-danger/90',
  'danger-ghost': 'text-danger hover:bg-danger-soft',
}

const sizeClass = {
  md: 'h-11 px-5 text-base',
  sm: 'h-10 px-3.5 text-[15px]',
}
</script>

<template>
  <button
    :type="props.type"
    :disabled="props.disabled || props.loading"
    :aria-busy="props.loading"
    class="inline-flex items-center justify-center gap-2 rounded font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    :class="[variantClass[props.variant], sizeClass[props.size], props.loading && 'disabled:cursor-wait disabled:opacity-80']"
  >
    <LoaderCircle v-if="props.loading" class="size-5 animate-spin" aria-hidden="true" />
    <slot />
  </button>
</template>
