<script setup lang="ts">
import { CalendarClock, ListChecks } from 'lucide-vue-next'
import type { AgendaEvent, FamilyMember } from '~/types/models'
import { isEventOngoing } from '~/utils/dashboard'

const props = defineProps<{
  member: FamilyMember
  now: Date
  isMe?: boolean
  isOwnerRow?: boolean
  nextEvent?: AgendaEvent | null
  pendingToday?: number | null
  canRemove?: boolean
}>()

const { removeMember } = useFamily()
const confirming = ref(false)

const eventText = computed(() => {
  const event = props.nextEvent
  if (!event) return null
  if (event.all_day) return `Hoje, o dia todo: ${event.title}`
  if (isEventOngoing(event, props.now)) return `Agora: ${event.title}`
  return `${formatTime(new Date(event.starts_at))} ${event.title}`
})

const pendingText = computed(() => {
  const n = props.pendingToday
  if (n === null || n === undefined) return null
  if (n === 0) return 'Nada pendente hoje'
  return `${n} ${n === 1 ? 'tarefa pendente' : 'tarefas pendentes'} hoje`
})
</script>

<template>
  <li class="py-4">
    <div class="flex items-start gap-3.5">
      <UiAvatar :name="member.display_name" />
      <div class="min-w-0 flex-1">
        <p class="flex flex-wrap items-baseline gap-x-2 text-base font-semibold text-ink">
          <span class="break-words">{{ member.display_name }}</span>
          <span v-if="isMe" class="text-sm font-normal text-ink-muted">você</span>
          <span v-if="isOwnerRow" class="rounded-sm bg-surface-strong px-1.5 text-[13px] font-medium text-ink-muted">Dono</span>
        </p>
        <FamilyStatusLine :member="member" :now="now" class="mt-0.5" />

        <ul v-if="eventText || pendingText" class="mt-2 flex flex-col gap-1 text-sm text-ink-muted">
          <li v-if="eventText" class="flex items-start gap-1.5">
            <CalendarClock class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span class="break-words">{{ eventText }}</span>
          </li>
          <li v-if="pendingText" class="flex items-start gap-1.5">
            <ListChecks class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{{ pendingText }}</span>
          </li>
        </ul>

        <slot />
      </div>
      <UiButton v-if="canRemove && !confirming" variant="ghost" size="sm" class="-mr-2" @click="confirming = true">
        Remover
      </UiButton>
    </div>

    <div
      v-if="confirming"
      role="group"
      aria-label="Confirmar remoção"
      class="ml-[3.375rem] mt-3 flex flex-wrap items-center gap-3 rounded bg-danger-soft px-3.5 py-3"
    >
      <p class="mr-auto text-[15px] text-danger">
        Remover {{ member.display_name }} da família? Os itens compartilhados deixam de aparecer para essa pessoa.
      </p>
      <UiButton variant="ghost" size="sm" @click="confirming = false">Cancelar</UiButton>
      <UiButton variant="danger" size="sm" @click="confirming = false; removeMember(member)">Remover</UiButton>
    </div>
  </li>
</template>
