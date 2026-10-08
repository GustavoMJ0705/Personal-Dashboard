<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'
import type { Task, TaskPriority } from '~/types/models'
import { audienceColumns, audienceOf } from '~/utils/family'
import { PRIORITY_LABEL, dueAtFor, taskTime } from '~/utils/tasks'

const props = defineProps<{ task: Task }>()
const emit = defineEmits<{ close: [] }>()

const { update, remove } = useTasks()
const { userId } = useAuth()
const { family } = useFamily()

const form = reactive({
  title: props.task.title,
  description: props.task.description ?? '',
  due_date: props.task.due_date ?? '',
  due_time: taskTime(props.task) ?? '',
  priority: props.task.priority,
  audience: audienceOf(props.task),
})
const isCreator = computed(() => props.task.user_id === userId.value)
const titleError = ref<string | null>(null)
const confirmingDelete = ref(false)
const root = ref<HTMLElement>()

const priorities: TaskPriority[] = ['low', 'normal', 'high']
const fieldId = (name: string) => `tarefa-${props.task.id}-${name}`

onMounted(() => {
  root.value?.querySelector<HTMLInputElement>(`#${CSS.escape(fieldId('titulo'))}`)?.focus()
})

function save() {
  const title = form.title.trim()
  if (!title) {
    titleError.value = 'Escreva um título para a tarefa.'
    return
  }
  emit('close')
  void update(props.task, {
    title,
    description: form.description.trim() || null,
    due_date: form.due_date || null,
    due_at: dueAtFor(form.due_date || null, form.due_time || null),
    priority: form.priority,
    ...audienceColumns(form.audience, family.value?.id ?? props.task.family_id),
  })
}

function confirmDelete() {
  emit('close')
  void remove(props.task)
}
</script>

<template>
  <form
    ref="root"
    class="mb-3 ml-11 mt-1 flex flex-col gap-4 rounded-lg bg-surface p-4"
    novalidate
    @submit.prevent="save"
    @keydown.esc.prevent="emit('close')"
  >
    <div>
      <UiTextField
        :id="fieldId('titulo')"
        v-model="form.title"
        label="Título"
        required
        :invalid="!!titleError"
        :describedby="titleError ? fieldId('titulo-erro') : undefined"
        @update:model-value="titleError = null"
      />
      <p v-if="titleError" :id="fieldId('titulo-erro')" role="alert" class="mt-1.5 text-sm text-danger">{{ titleError }}</p>
    </div>

    <div>
      <label :for="fieldId('descricao')" class="mb-1.5 block text-sm font-medium text-ink">Descrição</label>
      <textarea
        :id="fieldId('descricao')"
        v-model="form.description"
        rows="3"
        class="block w-full resize-y rounded border border-line-strong bg-canvas px-3.5 py-2.5 text-base text-ink transition-colors placeholder:text-ink-subtle hover:border-ink-subtle focus:border-accent"
        placeholder="Opcional"
      />
    </div>

    <div class="flex flex-col gap-4 sm:flex-row">
      <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,8rem)] gap-3 sm:w-80">
        <UiTextField :id="fieldId('data')" v-model="form.due_date" label="Vencimento" type="date" />
        <UiTextField
          :id="fieldId('hora')"
          v-model="form.due_time"
          label="Horário"
          type="time"
          :disabled="!form.due_date"
        />
      </div>

      <fieldset>
        <legend class="mb-1.5 block text-sm font-medium text-ink">Prioridade</legend>
        <div class="flex h-11 rounded border border-line-strong bg-canvas p-1">
          <label v-for="priority in priorities" :key="priority" class="flex-1 sm:flex-none">
            <input v-model="form.priority" type="radio" :value="priority" :name="fieldId('prioridade')" class="peer sr-only">
            <span
              class="flex h-full cursor-pointer items-center justify-center rounded-sm px-3 text-[15px] font-medium text-ink-muted transition-colors hover:text-ink peer-checked:bg-accent-soft peer-checked:text-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent"
            >
              {{ PRIORITY_LABEL[priority] }}
            </span>
          </label>
        </div>
      </fieldset>
    </div>

    <FamilyPeoplePicker
      v-if="family"
      :id="fieldId('para-quem')"
      v-model="form.audience"
      :can-make-personal="isCreator"
    />

    <div v-if="confirmingDelete" role="group" aria-label="Confirmar exclusão" class="flex flex-wrap items-center gap-3 rounded bg-danger-soft px-3.5 py-3">
      <p class="mr-auto text-[15px] text-danger">Excluir esta tarefa? Não dá para desfazer.</p>
      <UiButton variant="ghost" size="sm" @click="confirmingDelete = false">Cancelar</UiButton>
      <UiButton variant="danger" size="sm" @click="confirmDelete">Excluir</UiButton>
    </div>

    <div v-else class="flex flex-wrap items-center gap-2">
      <UiButton v-if="isCreator" variant="danger-ghost" size="sm" class="-ml-3" @click="confirmingDelete = true">
        <Trash2 class="size-4" aria-hidden="true" />
        Excluir
      </UiButton>
      <UiButton variant="ghost" size="sm" class="ml-auto" @click="emit('close')">Cancelar</UiButton>
      <UiButton type="submit" size="sm">Salvar</UiButton>
    </div>
  </form>
</template>
