<script setup lang="ts">
import { CircleAlert, Plus } from 'lucide-vue-next'
import { type AgendaView, daysInView, eventsOnDay, formatWeekLabel, rangeForDays } from '~/utils/agenda'

useHead({ title: 'Agenda' })

const route = useRoute()
const router = useRouter()
const { events, status, ensure, load, range, refreshOnVisible } = useAgenda()

const now = useNow()
const today = computed(() => toCivilDate(now.value))

const view = computed<AgendaView>(() => (route.query.visao === 'semana' ? 'week' : 'day'))
const date = computed(() => {
  const value = route.query.data
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : today.value
})
const days = computed(() => daysInView(view.value, date.value))
const requestedRange = computed(() => rangeForDays(days.value))

await ensure(requestedRange.value)
watch(requestedRange, (next) => ensure(next))
refreshOnVisible()

const creating = ref(false)
const editingId = ref<string | null>(null)

const periodLabel = computed(() =>
  view.value === 'week' ? formatWeekLabel(days.value) : formatLongDate(civilToDate(date.value)),
)
const showingToday = computed(() => days.value.includes(today.value) && (view.value === 'week' || date.value === today.value))
const byDay = computed(() => days.value.map((day) => ({ day, events: eventsOnDay(events.value, day) })))

function go(next: { view?: AgendaView, date?: string }) {
  const nextView = next.view ?? view.value
  const nextDate = next.date ?? date.value
  editingId.value = null
  router.replace({
    query: {
      ...route.query,
      visao: nextView === 'week' ? 'semana' : undefined,
      data: nextDate === today.value ? undefined : nextDate,
    },
  })
}

function move(step: -1 | 1) {
  go({ date: addDaysToCivilDate(date.value, step * (view.value === 'week' ? 7 : 1)) })
}

function onCreated(startDay: string) {
  if (!days.value.includes(startDay)) go({ date: startDay })
}

function retry() {
  if (range.value) void load(range.value)
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 class="font-display text-3xl font-semibold tracking-[-0.02em] text-ink md:text-4xl">Agenda</h1>
      <UiButton v-if="!creating" size="sm" @click="creating = true; editingId = null">
        <Plus class="size-5" aria-hidden="true" />
        Novo compromisso
      </UiButton>
    </div>

    <EventForm v-if="creating" :day="date" class="mt-6" @close="creating = false" @created="onCreated" />

    <AgendaToolbar
      class="mt-6"
      :view="view"
      :label="periodLabel"
      :showing-today="showingToday"
      @view="go({ view: $event })"
      @move="move"
      @today="go({ date: today })"
    />

    <div class="mt-6">
      <div v-if="status === 'loading' || status === 'idle'" aria-label="Carregando compromissos" class="divide-y divide-line border-y">
        <div v-for="n in 3" :key="n" class="flex items-center gap-4 py-4">
          <span class="h-4 w-14 shrink-0 animate-pulse rounded-sm bg-surface-strong" />
          <span class="h-4 animate-pulse rounded-sm bg-surface-strong" :style="{ width: `${65 - n * 12}%` }" />
        </div>
      </div>

      <div v-else-if="status === 'error'" role="alert" class="flex flex-col items-start gap-4 rounded-lg bg-danger-soft p-5">
        <p class="flex items-start gap-2.5 text-base text-danger">
          <CircleAlert class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          Não foi possível carregar a agenda. Verifique a conexão e tente de novo.
        </p>
        <UiButton variant="secondary" size="sm" @click="retry">Tentar de novo</UiButton>
      </div>

      <AgendaDayEvents
        v-else-if="view === 'day'"
        v-model:editing-id="editingId"
        :day="date"
        :events="byDay[0]?.events ?? []"
        empty-text="Nenhum compromisso neste dia."
        :label="periodLabel"
      />

      <div v-else class="flex flex-col gap-7">
        <section v-for="entry in byDay" :key="entry.day" :aria-labelledby="`dia-${entry.day}`">
          <h2 :id="`dia-${entry.day}`" class="mb-1 flex items-baseline gap-2 text-[15px] font-semibold">
            <NuxtLink
              :to="{ query: { ...route.query, visao: undefined, data: entry.day === today ? undefined : entry.day } }"
              class="rounded-sm first-letter:uppercase hover:text-accent"
              :class="entry.day === today ? 'text-accent' : 'text-ink'"
            >
              {{ formatLongDate(civilToDate(entry.day)) }}
            </NuxtLink>
            <span v-if="entry.day === today" class="rounded-sm bg-accent-soft px-1.5 text-[13px] font-medium text-accent">Hoje</span>
          </h2>
          <AgendaDayEvents
            v-model:editing-id="editingId"
            :day="entry.day"
            :events="entry.events"
            empty-text="Livre."
          />
        </section>
      </div>
    </div>
  </div>
</template>
