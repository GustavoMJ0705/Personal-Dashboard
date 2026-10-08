<script setup lang="ts">
import { CalendarClock, CalendarDays, CircleAlert, Plus } from 'lucide-vue-next'
import type { AgendaEvent } from '~/types/models'
import { type AgendaFilter, busyDays, daysBetween, eventDays, eventsOnDay, formatWeekRange, matchesFilter, rangeForDays, weekDays } from '~/utils/agenda'
import type { Audience } from '~/utils/family'

definePageMeta({ wide: true })
useHead({ title: 'Agenda' })

const STRIP_BEFORE = 21
const STRIP_AFTER = 42
const STRIP_STEP = 28
const UUID = /^[0-9a-f-]{36}$/i

const route = useRoute()
const router = useRouter()
const { userId } = useAuth()
const { events, status, ensure, load, range, refreshOnVisible } = useAgenda()
const { family, ensureLoaded: ensureFamily } = useFamily()

const now = useNow()
const today = computed(() => toCivilDate(now.value))

const date = computed(() => {
  const value = route.query.data
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : today.value
})
const filter = computed<AgendaFilter>(() => {
  const value = route.query.quem
  if (value === 'eu') return 'me'
  if (value === 'familia') return 'family'
  if (typeof value === 'string' && UUID.test(value)) return `member:${value}`
  return 'all'
})

type AgendaView = 'day' | 'week'
const view = computed<AgendaView>(() => (route.query.visao === 'semana' ? 'week' : 'day'))
const week = computed(() => weekDays(date.value))

const stripStart = ref(addDaysToCivilDate(date.value, -STRIP_BEFORE))
const stripEnd = ref(addDaysToCivilDate(date.value, STRIP_AFTER))
const days = computed(() => daysBetween(stripStart.value, stripEnd.value))
const stripRange = () => rangeForDays([stripStart.value, stripEnd.value])

await Promise.all([ensure(stripRange()), ensureFamily()])
refreshOnVisible()

function extend(direction: 'start' | 'end') {
  if (direction === 'start') stripStart.value = addDaysToCivilDate(stripStart.value, -STRIP_STEP)
  else stripEnd.value = addDaysToCivilDate(stripEnd.value, STRIP_STEP)
  void load(stripRange(), { silent: true })
}

watch(date, (day) => {
  if (day >= stripStart.value && day <= stripEnd.value) return
  stripStart.value = addDaysToCivilDate(day, -STRIP_BEFORE)
  stripEnd.value = addDaysToCivilDate(day, STRIP_AFTER)
  void load(stripRange())
})

const visible = computed(() => events.value.filter((event) => matchesFilter(event, filter.value, userId.value)))
const busy = computed(() => busyDays(visible.value))
const dayEvents = computed(() => eventsOnDay(visible.value, date.value))
const allDay = computed(() => dayEvents.value.filter((event) => event.all_day))
const timed = computed(() => dayEvents.value.filter((event) => !event.all_day))

const selectedId = ref<string | null>(null)
const isWide = useMediaQuery('(min-width: 1280px)')
const selected = computed(() => visible.value.find((event) => event.id === selectedId.value) ?? null)
const selectedDay = computed(() => {
  if (!selected.value) return date.value
  const { startDay, endDay } = eventDays(selected.value)
  return startDay <= date.value && date.value <= endDay ? date.value : startDay
})
const creating = ref(false)
const formAnchor = ref<HTMLElement>()
const asideFormAnchor = ref<HTMLElement>()

const dayLabel = computed(() => formatLongDate(civilToDate(date.value)))
const weekLabel = computed(() => formatWeekRange(week.value))
const emptyText = computed(() => {
  if (filter.value === 'all') return 'Nenhum compromisso neste dia.'
  if (filter.value === 'me') return 'Nenhum compromisso seu neste dia.'
  if (filter.value === 'family') return 'Nenhum compromisso da família toda neste dia.'
  return 'Nenhum compromisso dessa pessoa neste dia.'
})
const defaultAudience = computed<Audience>(() => {
  if (filter.value === 'family') return { kind: 'family' }
  if (filter.value.startsWith('member:')) return { kind: 'people', ids: [filter.value.slice('member:'.length)] }
  return { kind: 'me' }
})

function go(next: { date?: string, filter?: AgendaFilter, view?: AgendaView }) {
  const nextDate = next.date ?? date.value
  const nextFilter = next.filter ?? filter.value
  const nextView = next.view ?? view.value
  const quem = nextFilter === 'all'
    ? undefined
    : nextFilter === 'me' ? 'eu' : nextFilter === 'family' ? 'familia' : nextFilter.slice('member:'.length)
  if (next.date !== undefined) selectedId.value = null
  router.replace({
    query: {
      ...route.query,
      data: nextDate === today.value ? undefined : nextDate,
      quem,
      visao: nextView === 'week' ? 'semana' : undefined,
    },
  })
}

function select(event: AgendaEvent) {
  creating.value = false
  selectedId.value = selectedId.value === event.id ? null : event.id
}

function startCreating() {
  selectedId.value = null
  creating.value = true
  nextTick(() => (isWide.value ? asideFormAnchor : formAnchor).value?.scrollIntoView({ block: 'nearest' }))
}

const views: ReadonlyArray<{ key: AgendaView, label: string }> = [
  { key: 'day', label: 'Dia' },
  { key: 'week', label: 'Semana' },
]

function onCreated(startDay: string) {
  if (startDay !== date.value) go({ date: startDay })
}

function retry() {
  if (range.value) void load(range.value)
}
</script>

<template>
  <div class="xl:grid xl:grid-cols-[minmax(0,1fr)_24rem] xl:gap-x-8">
    <div class="flex flex-wrap items-center justify-between gap-4 md:flex-col md:justify-center xl:col-start-1 xl:row-start-1">
      <h1 class="font-display text-3xl font-semibold tracking-[-0.02em] text-ink md:text-4xl">Agenda</h1>
      <UiButton v-if="!creating" size="sm" class="xl:hidden" @click="startCreating">
        <Plus class="size-5" aria-hidden="true" />
        Novo compromisso
      </UiButton>
    </div>

    <div class="min-w-0 xl:col-start-1 xl:row-start-2">
      <div v-if="!isWide" ref="formAnchor">
        <EventForm
          v-if="creating"
          :day="date"
          :default-audience="defaultAudience"
          class="mt-6"
          @close="creating = false"
          @created="onCreated"
        />
      </div>

      <AgendaDayStrip
        class="mt-6"
        :days="days"
        :selected="date"
        :today="today"
        :busy="busy"
        @select="go({ date: $event })"
        @reach-start="extend('start')"
        @reach-end="extend('end')"
      />

      <div class="mt-5 flex flex-wrap items-center justify-between gap-3 md:justify-center">
        <p aria-live="polite" class="flex items-center gap-2 text-lg font-medium text-ink">
          <span class="first-letter:uppercase">{{ view === 'week' ? weekLabel : dayLabel }}</span>
          <span v-if="view === 'day' && date === today" class="rounded-sm bg-accent-soft px-1.5 text-[13px] font-medium text-accent">Hoje</span>
        </p>
        <div class="flex items-center gap-2">
          <div role="group" aria-label="Visão" class="inline-flex h-10 rounded border border-line-strong p-1">
            <button
              v-for="item in views"
              :key="item.key"
              type="button"
              class="rounded-sm px-3.5 text-sm font-medium transition-colors"
              :class="view === item.key ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:text-ink'"
              :aria-pressed="view === item.key"
              @click="go({ view: item.key })"
            >
              {{ item.label }}
            </button>
          </div>
          <UiButton v-if="date !== today" variant="secondary" size="sm" @click="go({ date: today })">Hoje</UiButton>
        </div>
      </div>

      <AgendaFilterChips v-if="family" class="mt-4" :filter="filter" @change="go({ filter: $event })" />

      <div class="mt-5">
        <div v-if="status === 'loading' || status === 'idle'" aria-label="Carregando compromissos" class="flex flex-col gap-2">
          <div class="h-[8.5rem] animate-pulse rounded-lg bg-surface" />
        </div>

        <div v-else-if="status === 'error'" role="alert" class="flex flex-col items-start gap-4 rounded-lg bg-danger-soft p-5">
          <p class="flex items-start gap-2.5 text-base text-danger">
            <CircleAlert class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            Não foi possível carregar a agenda. Verifique a conexão e tente de novo.
          </p>
          <UiButton variant="secondary" size="sm" @click="retry">Tentar de novo</UiButton>
        </div>

        <template v-else-if="view === 'week'">
          <AgendaWeekGrid
            class="hidden md:block"
            :days="week"
            :events="visible"
            :now="now"
            :today="today"
            :selected-day="date"
            :selected-id="selectedId"
            :label="weekLabel"
            @select="select"
            @pick-day="go({ date: $event })"
          />
          <AgendaWeekList
            class="md:hidden"
            :days="week"
            :events="visible"
            :today="today"
            :now="now"
            :selected-id="selectedId"
            @select="select"
          />
        </template>

        <UiEmptyState v-else-if="dayEvents.length === 0" class="bg-panel" :icon="CalendarDays" :text="emptyText">
          <UiButton v-if="!creating" variant="secondary" size="sm" @click="startCreating">
            <Plus class="size-4" aria-hidden="true" />
            Novo compromisso
          </UiButton>
        </UiEmptyState>

        <div v-else class="flex flex-col gap-4">
          <AgendaAllDay v-if="allDay.length" class="md:hidden" :events="allDay" :selected-id="selectedId" @select="select" />
          <AgendaTimelineVertical
            v-if="timed.length"
            class="md:hidden"
            :events="timed"
            :day="date"
            :now="now"
            :today="today"
            :selected-id="selectedId"
            :day-label="dayLabel"
            @select="select"
          />
          <AgendaTimeline
            v-if="timed.length || allDay.length"
            class="hidden md:block"
            :events="timed"
            :all-day="allDay"
            :day="date"
            :now="now"
            :today="today"
            :selected-id="selectedId"
            :day-label="dayLabel"
            @select="select"
          />
        </div>

        <p v-if="status === 'ready' && !selected && visible.length" class="mt-4 text-sm text-ink-muted md:text-center">
          Toque num compromisso para ver os detalhes.
        </p>

        <AgendaEventDetails
          v-if="selected && !isWide"
          :key="selected.id"
          :event="selected"
          :day="selectedDay"
          class="mt-4"
          @close="selectedId = null"
        />
      </div>
    </div>

    <aside class="hidden xl:sticky xl:top-8 xl:col-start-2 xl:row-start-2 xl:mt-6 xl:block xl:self-start" aria-label="Compromissos do dia">
      <section class="panel" aria-labelledby="lista-do-dia">
        <UiSectionTitle id="lista-do-dia" title="Compromissos do dia" :icon="CalendarClock" :count="status === 'ready' ? dayEvents.length : null" />
        <p class="mt-1 pl-11 text-sm text-ink-muted first-letter:uppercase">{{ dayLabel }}</p>

        <div ref="asideFormAnchor" class="mt-4">
          <EventForm
            v-if="isWide && creating"
            :day="date"
            :default-audience="defaultAudience"
            class="!p-3"
            @close="creating = false"
            @created="onCreated"
          />
          <UiButton v-else class="w-full" @click="startCreating">
            <Plus class="size-5" aria-hidden="true" />
            Novo compromisso
          </UiButton>
        </div>

        <div v-if="status === 'loading' || status === 'idle'" class="mt-4 flex flex-col gap-2" aria-label="Carregando compromissos">
          <div v-for="n in 3" :key="n" class="h-12 animate-pulse rounded bg-surface" />
        </div>
        <p v-else-if="dayEvents.length === 0" class="mt-4 text-[15px] text-ink-muted">{{ emptyText }}</p>
        <AgendaDayList v-else class="-mx-1 mt-4" :events="dayEvents" :selected-id="selectedId" :now="now" @select="select" />
      </section>

      <AgendaEventDetails
        v-if="selected && isWide"
        :key="selected.id"
        :event="selected"
        :day="selectedDay"
        class="mt-4"
        @close="selectedId = null"
      />
    </aside>
  </div>
</template>
