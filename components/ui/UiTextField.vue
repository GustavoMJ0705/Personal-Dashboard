<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    id: string
    label: string
    type?: string
    autocomplete?: string
    inputmode?: 'text' | 'email' | 'numeric' | 'tel' | 'search' | 'url'
    required?: boolean
    disabled?: boolean
    invalid?: boolean
    describedby?: string
  }>(),
  { type: 'text', required: false, disabled: false, invalid: false },
)

const model = defineModel<string>({ default: '' })
const slots = useSlots()

const PICKER_TYPES = new Set(['date', 'time', 'datetime-local'])

/** No celular, abre o seletor nativo de data/hora ao tocar no campo. */
function openPicker(event: MouseEvent) {
  const field = event.currentTarget as HTMLInputElement
  if (!PICKER_TYPES.has(props.type) || field.disabled) return
  try {
    field.showPicker()
  } catch {
    // Sem showPicker ou já aberto: segue o comportamento padrão do navegador.
  }
}
</script>

<template>
  <div>
    <label :for="props.id" class="mb-1.5 block text-sm font-medium text-ink">{{ props.label }}</label>
    <div class="relative">
      <input
        :id="props.id"
        v-model="model"
        :type="props.type"
        :autocomplete="props.autocomplete"
        :inputmode="props.inputmode"
        :required="props.required"
        :disabled="props.disabled"
        :aria-invalid="props.invalid || undefined"
        :aria-describedby="props.describedby"
        @click="openPicker"
        class="h-11 w-full min-w-0 rounded border bg-canvas px-3.5 text-base text-ink transition-colors placeholder:text-ink-subtle hover:border-ink-subtle focus:border-accent disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-60"
        :class="[props.invalid ? 'border-danger' : 'border-line-strong', slots.trailing && 'pr-12']"
      >
      <div v-if="slots.trailing" class="absolute inset-y-0 right-0 flex items-center pr-1">
        <slot name="trailing" />
      </div>
    </div>
  </div>
</template>
