<script setup lang="ts">
import { CircleAlert, Users } from 'lucide-vue-next'
import type { AgendaEvent, FamilyMember, Task } from '~/types/models'
import { eventEndMs } from '~/utils/agenda'
import { belongsTo } from '~/utils/family'

const props = defineProps<{
  now: Date
  today: string
  todayEvents: AgendaEvent[]
  openTasks: Task[]
}>()

const { userId } = useAuth()
const { family, me, others, status, load, setMyStatus } = useFamily()
const changingStatus = ref(false)

const rows = computed(() => (me.value ? [me.value, ...others.value] : others.value))

function nextEvent(member: FamilyMember) {
  return props.todayEvents.find((event) =>
    belongsTo(event, member.user_id, userId.value) && eventEndMs(event) >= props.now.getTime(),
  ) ?? null
}

function pendingToday(member: FamilyMember) {
  return props.openTasks.filter((task) =>
    task.due_date !== null && task.due_date <= props.today && belongsTo(task, member.user_id, userId.value),
  ).length
}

async function choose(next: Parameters<typeof setMyStatus>[0]) {
  changingStatus.value = false
  await setMyStatus(next)
}
</script>

<template>
  <section aria-labelledby="painel-familia" class="panel">
    <UiSectionTitle id="painel-familia" title="Família" :icon="Users">
      <template #action>
        <NuxtLink v-if="family" to="/familia" class="rounded-sm text-[15px] font-medium text-accent hover:text-accent-hover">Ver família</NuxtLink>
      </template>
    </UiSectionTitle>

    <div v-if="status === 'loading' || status === 'idle'" aria-label="Carregando família" class="mt-4 flex flex-col gap-4">
      <div v-for="n in 2" :key="n" class="flex items-center gap-3.5">
        <span class="size-10 animate-pulse rounded-full bg-surface-strong" />
        <span class="h-4 w-40 animate-pulse rounded-sm bg-surface-strong" />
      </div>
    </div>

    <div v-else-if="status === 'error'" role="alert" class="mt-4 flex flex-col items-start gap-4 rounded-lg bg-danger-soft p-5">
      <p class="flex items-start gap-2.5 text-base text-danger">
        <CircleAlert class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        Não foi possível carregar a família. Verifique a conexão e tente de novo.
      </p>
      <UiButton variant="secondary" size="sm" @click="load()">Tentar de novo</UiButton>
    </div>

    <UiEmptyState v-else-if="!family" class="mt-4" :icon="Users" text="Você ainda não faz parte de uma família.">
      <NuxtLink to="/familia" class="rounded-sm text-[15px] font-medium text-accent hover:text-accent-hover">Criar família</NuxtLink>
    </UiEmptyState>

    <ul v-else class="mt-2 divide-y divide-line border-y">
      <FamilyMemberRow
        v-for="member in rows"
        :key="member.id"
        :member="member"
        :now="now"
        :is-me="member.user_id === userId"
        :next-event="nextEvent(member)"
        :pending-today="pendingToday(member)"
      >
        <template v-if="member.user_id === userId">
          <FamilyStatusPicker
            v-if="changingStatus"
            class="mt-3"
            label="Seu status"
            :current="member.status"
            @select="choose"
          />
          <button
            type="button"
            class="-ml-1 mt-2 inline-flex h-9 items-center rounded px-1 text-[15px] font-medium text-accent hover:text-accent-hover"
            :aria-expanded="changingStatus"
            @click="changingStatus = !changingStatus"
          >
            {{ changingStatus ? 'Fechar' : 'Mudar status' }}
          </button>
        </template>
      </FamilyMemberRow>
    </ul>
  </section>
</template>
