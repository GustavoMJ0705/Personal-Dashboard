<script setup lang="ts">
import { Clock3, Plus } from 'lucide-vue-next'
import { addDaysToCivilDate } from '~/utils/datetime'
import { type TaskAudience, taskAudienceColumns } from '~/utils/family'
import { dueAtFor } from '~/utils/tasks'

const props = withDefaults(defineProps<{ today: string, withDueDate?: boolean }>(), { withDueDate: true })

const { create } = useTasks()
const { family } = useFamily()
const audience = ref<TaskAudience>({ kind: 'me' })

const title = ref('')
const due = ref(props.today)
const time = ref('')
const input = ref<HTMLInputElement>()

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
  const dueAt = props.withDueDate ? dueAtFor(due.value || null, time.value || null) : null
  title.value = ''
  time.value = ''
  input.value?.focus()
  const ok = await create({
    title: value,
    due_date: props.withDueDate ? due.value || null : props.today,
    due_at: dueAt,
    ...taskAudienceColumns(audience.value, family.value?.id ?? null),
  })
  if (!ok && !title.value) title.value = value
}
</script>

<template>
  <form class="rounded border border-line-strong focus-within:border-accent" @submit.prevent="submit">
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
        :placeholder="withDueDate ? 'Adicionar tarefa' : 'Adicionar tarefa para hoje'"
        class="h-12 min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-ink-subtle focus-visible:ring-0"
      >
      <UiButton v-if="title.trim()" type="submit" size="sm">Adicionar</UiButton>
    </div>

    <fieldset v-if="withDueDate" class="flex flex-wrap items-center gap-1.5 border-t px-2.5 py-2">
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
      <label
        for="nova-tarefa-hora"
        class="inline-flex h-8 items-center gap-1 rounded-sm pl-2 transition-colors"
        :class="[time ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-surface', !due && 'opacity-50']"
      >
        <Clock3 class="size-4 shrink-0" aria-hidden="true" />
        <span class="sr-only">Horário (opcional)</span>
        <input
          id="nova-tarefa-hora"
          v-model="time"
          type="time"
          :disabled="!due"
          class="h-8 bg-transparent pr-2 text-base disabled:cursor-not-allowed [&::-webkit-calendar-picker-indicator]:hidden"
        >
      </label>
    </fieldset>

    <div v-if="withDueDate && family" class="border-t px-2.5 py-2">
      <FamilyPeoplePicker id="nova-tarefa-para-quem" v-model="audience" compact />
    </div>
  </form>
</template>
