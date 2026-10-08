<script setup lang="ts">
import { CircleAlert, MapPin } from 'lucide-vue-next'
import type { AgendaEvent } from '~/types/models'
import { isEventOngoing } from '~/utils/dashboard'
import { formatDayLabel } from '~/utils/datetime'

const props = defineProps<{
  events: AgendaEvent[]
  now: Date
  today: string
}>()

const { status, load } = useUpcomingEvents()

const rows = computed(() =>
  props.events.map((event) => {
    const start = new Date(event.starts_at)
    const ongoing = !event.all_day && isEventOngoing(event, props.now)
    return {
      event,
      ongoing,
      time: event.all_day ? 'Dia todo' : ongoing ? 'Agora' : formatTime(start),
      day: ongoing ? `até ${formatTime(new Date(event.ends_at))}` : formatDayLabel(toCivilDate(start), props.today),
    }
  }),
)
</script>

<template>
  <section aria-labelledby="painel-compromissos">
    <div class="flex items-baseline justify-between gap-4">
      <h2 id="painel-compromissos" class="text-lg font-semibold text-ink">Próximos compromissos</h2>
      <NuxtLink to="/agenda" class="rounded-sm text-[15px] font-medium text-accent hover:text-accent-hover">Ver agenda</NuxtLink>
    </div>

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

    <p v-else-if="rows.length === 0" class="mt-4 text-base text-ink-muted">Nenhum compromisso pela frente.</p>

    <ul v-else class="mt-4 divide-y divide-line border-y">
      <li v-for="row in rows" :key="row.event.id" class="flex gap-4 py-3.5">
        <div class="w-20 shrink-0 tabular-nums">
          <time
            :datetime="row.event.starts_at"
            class="block text-base font-medium"
            :class="row.ongoing ? 'text-accent' : 'text-ink'"
          >{{ row.time }}</time>
          <span class="block text-sm text-ink-muted">{{ row.day }}</span>
        </div>
        <div class="min-w-0 flex-1">
          <p class="break-words text-base leading-snug text-ink">{{ row.event.title }}</p>
          <p v-if="row.event.location" class="mt-1 flex items-start gap-1.5 text-sm text-ink-muted">
            <MapPin class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span class="break-words">{{ row.event.location }}</span>
          </p>
        </div>
      </li>
    </ul>
  </section>
</template>
