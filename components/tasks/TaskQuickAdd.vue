<script setup lang="ts">
import { Clock3, Plus } from 'lucide-vue-next'
import { addDaysToCivilDate, formatDayLabel } from '~/utils/datetime'
import { type Audience, audienceColumns } from '~/utils/family'
import { dueAtFor } from '~/utils/tasks'

/** `collapsible`: as opções (dia, horário, para quem) só aparecem ao tocar no campo. */
const props = withDefaults(defineProps<{ today: string, collapsible?: boolean }>(), { collapsible: false })

const { create } = useTasks()
const toast = useToast()
const { family } = useFamily()
const audience = ref<Audience>({ kind: 'me' })

const title = ref('')
const due = ref(props.today)
const time = ref('')
const timeInput = ref<HTMLInputElement>()

/** No celular, focar o campo não abre o seletor de hora: abre explicitamente. */
function openTimePicker() {
  const field = timeInput.value
  if (!field || field.disabled) return
  field.focus()
  try {
    field.showPicker()
  } catch {
    // Navegador sem showPicker: o campo já está focado para digitar.
  }
}
const input = ref<HTMLInputElement>()
const form = ref<HTMLFormElement>()
const expanded = ref(!props.collapsible)

const isPristine = () => !title.value.trim() && due.value === props.today && !time.value && audience.value.kind === 'me'

function onFocusOut() {
  if (!props.collapsible) return
  setTimeout(() => {
    if (form.value?.contains(document.activeElement)) return
    if (isPristine()) expanded.value = false
  })
}

const tomorrow = computed(() => addDaysToCivilDate(props.today, 1))
const presets = computed(() => [
  { label: 'Hoje', value: props.today },
  { label: 'Amanhã', value: tomorrow.value },
  { label: 'Sem data', value: '' },
])

watch(
  () => props.today,
  (next, previous) => {
    if (due.value === previous) due.value = next
  },
)

async function submit() {
  const value = title.value.trim()
  if (!value) return
  const dueDate = due.value || null
  const dueAt = dueAtFor(dueDate, time.value || null)
  title.value = ''
  time.value = ''
  input.value?.focus()
  const ok = await create({
    title: value,
    due_date: dueDate,
    due_at: dueAt,
    ...audienceColumns(audience.value, family.value?.id ?? null),
  })
  if (!ok && !title.value) title.value = value
  else if (ok && props.collapsible && dueDate !== props.today) {
    toast.success(dueDate ? `Tarefa adicionada para ${formatDayLabel(dueDate, props.today).toLowerCase()}.` : 'Tarefa adicionada sem data.')
  }
}
</script>

<template>
  <form ref="form" class="rounded border border-line-strong focus-within:border-accent" @submit.prevent="submit" @focusin="expanded = true" @focusout="onFocusOut">
    <div class="flex items-center gap-2 pl-3.5 pr-1.5">
      <Plus class="size-5 shrink-0 text-ink-subtle" aria-hidden="true" />
      <label for="nova-tarefa" class="sr-only">Nova tarefa</label>
      <input
        id="nova-tarefa"
        ref="input"
        v-model="title"
        type="text"
        autocomplete="off"
        enterkeyhint="done"
        maxlength="500"
        placeholder="Adicionar tarefa"
        class="h-12 min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-ink-subtle focus-visible:ring-0"
      >
      <UiButton v-if="title.trim()" type="submit" size="sm">Adicionar</UiButton>
    </div>

    <fieldset v-if="expanded" class="flex flex-wrap items-center gap-1.5 border-t px-2.5 py-2">
      <legend class="sr-only">Vencimento</legend>
      <button
        v-for="preset in presets"
        :key="preset.label"
        type="button"
        class="h-8 rounded-sm px-2.5 text-sm font-medium transition-colors"
        :class="due === preset.value ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-surface hover:text-ink'"
        :aria-pressed="due === preset.value"
        @click="due = preset.value"
      >
        {{ preset.label }}
      </button>
      <label for="nova-tarefa-data" class="sr-only">Outra data</label>
      <input
        id="nova-tarefa-data"
        v-model="due"
        type="date"
        class="h-8 rounded-sm bg-transparent px-2 text-base text-ink-muted transition-colors hover:bg-surface"
        :class="due && due !== today && due !== tomorrow && 'bg-accent-soft text-accent'"
      >
      <div
        class="inline-flex h-8 cursor-pointer items-center gap-1 rounded-sm pl-2 transition-colors"
        :class="[time ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-surface', !due && 'pointer-events-none opacity-50']"
        @click="openTimePicker"
      >
        <Clock3 class="size-4 shrink-0" aria-hidden="true" />
        <label for="nova-tarefa-hora" class="sr-only">Horário (opcional)</label>
        <input
          id="nova-tarefa-hora"
          ref="timeInput"
          v-model="time"
          type="time"
          :disabled="!due"
          class="h-8 min-w-[6.5rem] bg-transparent pr-2 text-base disabled:cursor-not-allowed"
        >
      </div>
    </fieldset>

    <div v-if="expanded && family" class="border-t px-2.5 py-2">
      <FamilyPeoplePicker id="nova-tarefa-para-quem" v-model="audience" compact />
    </div>
  </form>
</template>
