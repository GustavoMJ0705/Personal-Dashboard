<script setup lang="ts">
import { CircleAlert, Sparkles } from 'lucide-vue-next'
import { OPEN_GROUPS, groupOpenTasks, sortCompletedTasks } from '~/utils/tasks'

useHead({ title: 'Tarefas' })

type Tab = 'open' | 'completed'

const route = useRoute()
const router = useRouter()
const { tasks, status, load, ensureLoaded, subscribe } = useTasks()

await ensureLoaded()
onMounted(subscribe)

const now = useNow()
const today = computed(() => toCivilDate(now.value))

const tab = computed<Tab>(() => (route.query.aba === 'concluidas' ? 'completed' : 'open'))
const editingId = ref<string | null>(null)

const openTasks = computed(() => tasks.value.filter((task) => task.completed_at === null))
const completedTasks = computed(() => sortCompletedTasks(tasks.value.filter((task) => task.completed_at !== null)))
const groups = computed(() => {
  const grouped = groupOpenTasks(openTasks.value, today.value)
  return OPEN_GROUPS.map((group) => ({ ...group, tasks: grouped[group.key] })).filter((group) => group.tasks.length > 0)
})

const tabs: ReadonlyArray<{ key: Tab, label: string }> = [
  { key: 'open', label: 'Abertas' },
  { key: 'completed', label: 'Concluídas' },
]
const tabRefs = ref<HTMLButtonElement[]>([])

function selectTab(next: Tab) {
  editingId.value = null
  router.replace({ query: { ...route.query, aba: next === 'completed' ? 'concluidas' : undefined } })
}

function onTabKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  const next: Tab = tab.value === 'open' ? 'completed' : 'open'
  selectTab(next)
  tabRefs.value[tabs.findIndex((item) => item.key === next)]?.focus()
}
</script>

<template>
  <div>
    <h1 class="font-display text-3xl font-semibold tracking-[-0.02em] text-ink md:text-4xl">Tarefas</h1>

    <div class="panel mt-6">
      <div role="tablist" aria-label="Filtrar tarefas" class="-mt-1 flex gap-1 border-b">
        <button
          v-for="item in tabs"
          :id="`aba-${item.key}`"
          :key="item.key"
          ref="tabRefs"
          type="button"
          role="tab"
          :aria-selected="tab === item.key"
          aria-controls="painel-tarefas"
          :tabindex="tab === item.key ? 0 : -1"
          class="-mb-px inline-flex h-11 items-center gap-2 rounded-t-sm border-b-2 px-3 text-[15px] font-medium transition-colors"
          :class="tab === item.key ? 'border-accent text-ink' : 'border-transparent text-ink-muted hover:text-ink'"
          @click="selectTab(item.key)"
          @keydown="onTabKeydown"
        >
          {{ item.label }}
          <span
            v-if="item.key === 'open' && status === 'ready'"
            class="rounded-sm px-1.5 text-[13px] tabular-nums"
            :class="tab === item.key ? 'bg-accent-soft text-accent' : 'bg-surface-strong text-ink-muted'"
          >{{ openTasks.length }}</span>
        </button>
      </div>

      <div id="painel-tarefas" role="tabpanel" :aria-labelledby="`aba-${tab}`" class="mt-6">
        <TaskQuickAdd v-if="tab === 'open'" :today="today" class="mb-8" />

        <div v-if="status === 'loading' || status === 'idle'" aria-label="Carregando tarefas" class="divide-y divide-line border-y">
          <div v-for="n in 4" :key="n" class="flex items-center gap-3 py-4">
            <span class="size-[1.375rem] shrink-0 animate-pulse rounded-full bg-surface-strong" />
            <span class="h-4 animate-pulse rounded-sm bg-surface-strong" :style="{ width: `${70 - n * 10}%` }" />
          </div>
        </div>

        <div v-else-if="status === 'error'" role="alert" class="flex flex-col items-start gap-4 rounded-lg bg-danger-soft p-5">
          <p class="flex items-start gap-2.5 text-base text-danger">
            <CircleAlert class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            Não foi possível carregar as tarefas. Verifique a conexão e tente de novo.
          </p>
          <UiButton variant="secondary" size="sm" @click="load()">Tentar de novo</UiButton>
        </div>

        <template v-else-if="tab === 'open'">
          <UiEmptyState v-if="groups.length === 0" :icon="Sparkles" text="Nenhuma tarefa aberta. Escreva no campo acima para criar a primeira." />
          <div v-else class="flex flex-col gap-8">
            <section v-for="group in groups" :key="group.key" :aria-labelledby="`grupo-${group.key}`">
              <h2 :id="`grupo-${group.key}`" class="mb-2 flex items-baseline gap-2 text-[15px] font-semibold" :class="group.key === 'overdue' ? 'text-danger' : 'text-ink'">
                {{ group.label }}
                <span class="font-normal tabular-nums text-ink-subtle">{{ group.tasks.length }}</span>
              </h2>
              <TaskList v-model:editing-id="editingId" :tasks="group.tasks" :context="group.key" :today="today" :label="group.label" />
            </section>
          </div>
        </template>

        <template v-else>
          <p v-if="completedTasks.length === 0" class="text-base text-ink-muted">
            Nenhuma tarefa concluída ainda. As que você marcar como feitas aparecem aqui.
          </p>
          <TaskList v-else v-model:editing-id="editingId" :tasks="completedTasks" context="completed" :today="today" label="Concluídas" />
        </template>
      </div>
    </div>
  </div>
</template>
