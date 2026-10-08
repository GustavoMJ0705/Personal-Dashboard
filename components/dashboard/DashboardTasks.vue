<script setup lang="ts">
import { CircleAlert } from 'lucide-vue-next'
import type { Task } from '~/types/models'

defineProps<{
  today: string
  overdue: Task[]
  dueToday: Task[]
}>()

const { status, load } = useTasks()
const editingId = ref<string | null>(null)
</script>

<template>
  <section aria-labelledby="painel-tarefas-hoje">
    <div class="flex items-baseline justify-between gap-4">
      <h2 id="painel-tarefas-hoje" class="text-lg font-semibold text-ink">Tarefas</h2>
      <NuxtLink to="/tarefas" class="rounded-sm text-[15px] font-medium text-accent hover:text-accent-hover">Ver todas</NuxtLink>
    </div>

    <TaskQuickAdd :today="today" :with-due-date="false" class="mt-4" />

    <div v-if="status === 'loading' || status === 'idle'" aria-label="Carregando tarefas" class="mt-6 divide-y divide-line border-y">
      <div v-for="n in 3" :key="n" class="flex items-center gap-3 py-4">
        <span class="size-[1.375rem] shrink-0 animate-pulse rounded-full bg-surface-strong" />
        <span class="h-4 animate-pulse rounded-sm bg-surface-strong" :style="{ width: `${70 - n * 12}%` }" />
      </div>
    </div>

    <div v-else-if="status === 'error'" role="alert" class="mt-6 flex flex-col items-start gap-4 rounded-lg bg-danger-soft p-5">
      <p class="flex items-start gap-2.5 text-base text-danger">
        <CircleAlert class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        Não foi possível carregar as tarefas. Verifique a conexão e tente de novo.
      </p>
      <UiButton variant="secondary" size="sm" @click="load()">Tentar de novo</UiButton>
    </div>

    <p v-else-if="overdue.length === 0 && dueToday.length === 0" class="mt-6 text-base text-ink-muted">
      Nada para hoje. Se surgir alguma coisa, escreva no campo acima.
    </p>

    <div v-else class="mt-6 flex flex-col gap-6">
      <div v-if="overdue.length > 0">
        <h3 class="mb-2 flex items-baseline gap-2 text-[15px] font-semibold text-danger">
          Atrasadas <span class="font-normal tabular-nums text-ink-subtle">{{ overdue.length }}</span>
        </h3>
        <TaskList v-model:editing-id="editingId" :tasks="overdue" context="overdue" :today="today" label="Atrasadas" />
      </div>
      <div v-if="dueToday.length > 0">
        <h3 class="mb-2 flex items-baseline gap-2 text-[15px] font-semibold text-ink">
          Hoje <span class="font-normal tabular-nums text-ink-subtle">{{ dueToday.length }}</span>
        </h3>
        <TaskList v-model:editing-id="editingId" :tasks="dueToday" context="today" :today="today" label="Hoje" />
      </div>
    </div>
  </section>
</template>
