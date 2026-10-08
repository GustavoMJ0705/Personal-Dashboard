<script setup lang="ts">
import { CalendarClock, CalendarDays, CircleAlert, MapPin } from 'lucide-vue-next'
import type { AgendaEvent } from '~/types/models'
import { eventEndMs } from '~/utils/agenda'
import { isEventOngoing } from '~/utils/dashboard'
import { audienceLabel } from '~/utils/family'

const props = defineProps<{
  events: AgendaEvent[]
  now: Date
}>()

const { status, load } = useDayEvents()
const { members } = useFamily()
const { userId } = useAuth()

const nextId = computed(() => props.events.find((event) => eventEndMs(event) >= props.now.getTime())?.id ?? null)

const rows = computed(() =>
  props.events.map((event) => {
    const ongoing = !event.all_day && isEventOngoing(event, props.now)
    const past = eventEndMs(event) < props.now.getTime()
    return {
      event,
      ongoing,
      past,
      next: event.id === nextId.value,
      time: event.all_day ? 'Dia todo' : formatTime(new Date(event.starts_at)),
      until: event.all_day ? null : `até ${formatTime(new Date(event.ends_at))}`,
      forWhom: audienceLabel(event, members.value, userId.value),
    }
  }),
)
</script>

<template>
  <section aria-labelledby="painel-compromissos" class="panel">
    <UiSectionTitle id="painel-compromissos" title="Compromissos de hoje" :icon="CalendarClock">
      <template #action>
        <NuxtLink to="/agenda" class="rounded-sm text-[15px] font-medium text-accent hover:text-accent-hover">Ver agenda</NuxtLink>
      </template>
    </UiSectionTitle>

    <div v-if="status === 'loading' || status === 'idle'" aria-label="Carregando compromissos" class="mt-4 divide-y divide-line border-y">
      <div v-for="n in 2" :key="n" class="flex items-center gap-4 py-4">
        <span class="h-4 w-14 shrink-0 animate-pulse rounded-sm bg-surface-strong" />
        <span class="h-4 animate-pulse rounded-sm bg-surface-strong" :style="{ width: `${60 - n * 15}%` }" />
      </div>
    </div>

    <div v-else-if="status === 'error'" role="alert" class="mt-4 flex flex-col items-start gap-4 rounded-lg bg-danger-soft p-5">
      <p class="flex items-start gap-2.5 text-base text-danger">
        <CircleAlert class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        Não foi possível carregar os compromissos. Verifique a conexão e tente de novo.
      </p>
      <UiButton variant="secondary" size="sm" @click="load()">Tentar de novo</UiButton>
    </div>

    <UiEmptyState v-else-if="rows.length === 0" class="mt-4" :icon="CalendarDays" text="Nenhum compromisso hoje." />

    <ol v-else class="mt-4 flex flex-col">
      <li
        v-for="row in rows"
        :key="row.event.id"
        class="flex gap-4 border-b border-line px-3 py-3.5 first:border-t"
        :class="row.next && 'rounded border-transparent bg-accent-soft first:border-t-transparent'"
      >
        <div class="w-20 shrink-0 whitespace-nowrap tabular-nums">
          <time
            :datetime="row.event.starts_at"
            class="block text-base font-medium"
            :class="row.next ? 'text-accent' : row.past ? 'text-ink-muted' : 'text-ink'"
          >{{ row.time }}</time>
          <span v-if="row.until" class="block text-sm text-ink-muted">{{ row.until }}</span>
        </div>
        <div class="min-w-0 flex-1">
          <p class="flex flex-wrap items-baseline gap-x-2">
            <span class="break-words text-base leading-snug" :class="row.past ? 'text-ink-muted' : 'text-ink'">{{ row.event.title }}</span>
            <span v-if="row.next" class="text-sm font-medium text-accent">{{ row.ongoing ? 'Agora' : 'Próximo' }}</span>
          </p>
          <p v-if="row.event.location || row.forWhom" class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
            <span v-if="row.event.location" class="flex items-start gap-1.5">
              <MapPin class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span class="break-words">{{ row.event.location }}</span>
            </span>
            <span v-if="row.forWhom">{{ row.forWhom }}</span>
          </p>
        </div>
      </li>
    </ol>
  </section>
</template>
