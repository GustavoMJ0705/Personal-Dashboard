<script setup lang="ts">
import { CalendarArrowUp, Check } from 'lucide-vue-next'
import { isTempTask } from '~/composables/useTasks'
import type { Task } from '~/types/models'
import { addDaysToCivilDate, formatCivilDate, formatDate } from '~/utils/datetime'
import { PRIORITY_LABEL, type TaskRowContext } from '~/utils/tasks'

const props = defineProps<{
  task: Task
  context: TaskRowContext
  today: string
  editing: boolean
}>()
const emit = defineEmits<{ edit: [], close: [] }>()

const { toggleComplete, postpone } = useTasks()
const titleButton = ref<HTMLButtonElement>()

const done = computed(() => props.task.completed_at !== null)
const syncing = computed(() => isTempTask(props.task))

const dueText = computed(() => {
  const due = props.task.due_date
  if (props.context === 'completed') {
    return props.task.completed_at ? `Concluída em ${formatDate(new Date(props.task.completed_at))}` : null
  }
  if (!due) return null
  if (props.context === 'overdue') {
    return due === addDaysToCivilDate(props.today, -1) ? 'Venceu ontem' : `Venceu em ${formatCivilDate(due)}`
  }
  if (props.context === 'upcoming') return formatCivilDate(due)
  return null
})

function closeEditor() {
  emit('close')
  nextTick(() => titleButton.value?.focus())
}
</script>

<template>
  <li :aria-busy="syncing || undefined">
    <div class="flex items-start gap-3 py-2.5" :class="syncing && 'opacity-60'">
      <label class="relative -my-0.5 -ml-2.5 flex size-11 shrink-0 cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          class="peer size-[1.375rem] cursor-pointer appearance-none rounded-full border-2 border-line-strong transition-colors checked:border-accent checked:bg-accent hover:border-accent disabled:cursor-wait"
          :checked="done"
          :disabled="syncing"
          :aria-label="done ? `Reabrir: ${task.title}` : `Concluir: ${task.title}`"
          @change="toggleComplete(task)"
        >
        <Check
          class="pointer-events-none absolute size-3.5 text-accent-contrast opacity-0 transition-opacity peer-checked:opacity-100"
          :stroke-width="3"
          aria-hidden="true"
        />
      </label>

      <button
        ref="titleButton"
        type="button"
        class="min-w-0 flex-1 rounded py-2 text-left"
        :aria-expanded="editing"
        :disabled="syncing"
        @click="editing ? closeEditor() : emit('edit')"
      >
        <span
          class="block break-words text-base leading-snug"
          :class="done ? 'text-ink-subtle line-through' : 'text-ink'"
        >{{ task.title }}</span>
        <span v-if="dueText || task.priority !== 'normal' || task.description" class="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
          <span v-if="dueText" :class="context === 'overdue' ? 'font-medium text-danger' : 'text-ink-muted'">{{ dueText }}</span>
          <span
            v-if="task.priority !== 'normal' && !done"
            class="rounded-sm px-1.5 py-px text-[13px] font-medium"
            :class="task.priority === 'high' ? 'bg-warning-soft text-warning' : 'bg-surface-strong text-ink-muted'"
          >Prioridade {{ PRIORITY_LABEL[task.priority].toLowerCase() }}</span>
          <span v-if="task.description" class="line-clamp-1 basis-full text-ink-muted">{{ task.description }}</span>
        </span>
      </button>

      <button
        v-if="!done"
        type="button"
        class="inline-flex h-10 shrink-0 items-center gap-1.5 rounded px-2.5 text-[15px] font-medium text-ink-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-50"
        :disabled="syncing"
        :aria-label="`Adiar: ${task.title}`"
        @click="postpone(task)"
      >
        <CalendarArrowUp class="size-[1.125rem]" aria-hidden="true" />
        Adiar
      </button>
    </div>

    <TaskEditor v-if="editing" :task="task" @close="closeEditor" />
  </li>
</template>
