<script setup lang="ts">
import { taskKey } from '~/composables/useTasks'
import type { Task } from '~/types/models'
import type { TaskRowContext } from '~/utils/tasks'

defineProps<{
  tasks: Task[]
  context: TaskRowContext
  today: string
  label?: string
}>()

const editingId = defineModel<string | null>('editingId', { default: null })
</script>

<template>
  <TransitionGroup
    tag="ul"
    :aria-label="label"
    class="divide-y divide-line border-y"
    leave-active-class="transition-opacity duration-150"
    leave-to-class="opacity-0"
  >
    <TaskItem
      v-for="task in tasks"
      :key="taskKey(task)"
      :task="task"
      :context="context"
      :today="today"
      :editing="editingId === task.id"
      @edit="editingId = task.id"
      @close="editingId = null"
    />
  </TransitionGroup>
</template>
