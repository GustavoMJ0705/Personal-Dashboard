<script setup lang="ts">
import { Users } from 'lucide-vue-next'
import type { Audience } from '~/utils/family'

const props = withDefaults(defineProps<{ id: string, canMakePersonal?: boolean, compact?: boolean }>(), {
  canMakePersonal: true,
  compact: false,
})
const model = defineModel<Audience>({ required: true })

const { others, me } = useFamily()

const options = computed(() => {
  const list: Array<{ value: Audience, label: string, disabled?: boolean }> = [
    { value: 'me', label: 'Eu', disabled: !props.canMakePersonal },
    { value: 'family', label: 'Família toda' },
    ...others.value.map((m) => ({ value: `member:${m.user_id}` as Audience, label: m.display_name })),
  ]
  if (me.value && model.value === `member:${me.value.user_id}`) {
    list.splice(2, 0, { value: model.value, label: 'Você, visível para a família' })
  }
  return list
})
</script>

<template>
  <div :class="props.compact && 'flex items-center gap-1 text-ink-muted'">
    <Users v-if="props.compact" class="size-4 shrink-0" aria-hidden="true" />
    <label :for="props.id" :class="props.compact ? 'sr-only' : 'mb-1.5 block text-sm font-medium text-ink'">Para quem</label>
    <select
      :id="props.id"
      v-model="model"
      class="cursor-pointer rounded text-base transition-colors"
      :class="props.compact
        ? 'h-8 max-w-[11rem] bg-transparent pl-1 pr-1 text-ink-muted hover:bg-surface hover:text-ink'
        : 'h-11 w-full border border-line-strong bg-canvas px-3 text-ink hover:border-ink-subtle focus:border-accent'"
    >
      <option v-for="option in options" :key="option.value" :value="option.value" :disabled="option.disabled">
        {{ option.label }}
      </option>
    </select>
  </div>
</template>
