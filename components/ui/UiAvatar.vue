<script setup lang="ts">
import { Users } from 'lucide-vue-next'
import { initials } from '~/utils/family'

const props = withDefaults(defineProps<{ name?: string, family?: boolean, size?: 'sm' | 'md' | 'lg' }>(), {
  name: '',
  family: false,
  size: 'md',
})

const sizeClass = { sm: 'size-6 text-[11px]', md: 'size-10 text-sm', lg: 'size-14 text-lg' }
const iconClass = { sm: 'size-3.5', md: 'size-5', lg: 'size-6' }
</script>

<template>
  <span
    class="inline-flex shrink-0 select-none items-center justify-center rounded-full bg-accent-soft font-semibold tracking-tight text-accent"
    :class="sizeClass[props.size]"
    aria-hidden="true"
  >
    <Users v-if="props.family" :class="iconClass[props.size]" />
    <template v-else>{{ initials(props.name) }}</template>
  </span>
</template>
