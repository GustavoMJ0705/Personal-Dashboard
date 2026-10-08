<script setup lang="ts">
import { CircleAlert, Plus } from 'lucide-vue-next'
import type { AgendaEvent } from '~/types/models'
import { type AgendaFilter, busyDays, daysBetween, eventsOnDay, matchesFilter, rangeForDays } from '~/utils/agenda'
import type { Audience } from '~/utils/family'

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
const selected = computed(() => dayEvents.value.find((event) => event.id === selectedId.value) ?? null)
const creating = ref(false)
const formAnchor = ref<HTMLElement>()

const dayLabel = computed(() => formatLongDate(civilToDate(date.value)))
const emptyText = computed(() => {
  if (filter.value === 'all') return 'Nenhum compromisso neste dia.'
  if (filter.value === 'me') return 'Nenhum compromisso seu neste dia.'
  if (filter.value === 'family') return 'Nenhum compromisso da família toda neste dia.'
  return 'Nenhum compromisso dessa pessoa neste dia.'
})
const defaultAudience = computed<Audience>(() => {
  if (filter.value === 'family') return 'family'
  if (filter.value.startsWith('member:')) return filter.value as Audience
  return 'me'
})

function go(next: { date?: string, filter?: AgendaFilter }) {
  const nextDate = next.date ?? date.value
  const nextFilter = next.filter ?? filter.value
  const quem = nextFilter === 'all'
    ? undefined
    : nextFilter === 'me' ? 'eu' : nextFilter === 'family' ? 'familia' : nextFilter.slice('member:'.length)
  if (next.date !== undefined) selectedId.value = null
  router.replace({ query: { ...route.query, data: nextDate === today.value ? undefined : nextDate, quem } })
}

function select(event: AgendaEvent) {
  creating.value = false
  selectedId.value = selectedId.value === event.id ? null : event.id
}

function startCreating() {
  selectedId.value = null
  creating.value = true
  nextTick(() => formAnchor.value?.scrollIntoView({ block: 'nearest' }))
}

function onCreated(startDay: string) {
  if (startDay !== date.value) go({ date: startDay })
}

function retry() {
  if (range.value) void load(range.value)
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 class="font-display text-3xl font-semibold tracking-[-0.02em] text-ink md:text-4xl">Agenda</h1>
      <UiButton v-if="!creating" size="sm" @click="startCreating">
        <Plus class="size-5" aria-hidden="true" />
        Novo compromisso
      </UiButton>
    </div>

    <div ref="formAnchor">
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

    <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
      <p aria-live="polite" class="flex items-center gap-2 text-lg font-medium text-ink">
        <span class="first-letter:uppercase">{{ dayLabel }}</span>
        <span v-if="date === today" class="rounded-sm bg-accent-soft px-1.5 text-[13px] font-medium text-accent">Hoje</span>
      </p>
      <UiButton v-if="date !== today" variant="secondary" size="sm" @click="go({ date: today })">Hoje</UiButton>
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

      <div v-else-if="dayEvents.length === 0" class="flex flex-col items-start gap-3 rounded-lg border border-dashed border-line-strong px-5 py-6">
        <p class="text-base text-ink-muted">{{ emptyText }}</p>
        <UiButton v-if="!creating" variant="secondary" size="sm" @click="startCreating">
          <Plus class="size-4" aria-hidden="true" />
          Novo compromisso
        </UiButton>
      </div>

      <div v-else class="flex flex-col gap-4">
        <AgendaAllDay v-if="allDay.length" :events="allDay" :selected-id="selectedId" @select="select" />
        <AgendaTimeline
          v-if="timed.length"
          :events="timed"
          :day="date"
          :now="now"
          :today="today"
          :selected-id="selectedId"
          :day-label="dayLabel"
          @select="select"
        />
        <p v-if="!selected" class="text-sm text-ink-muted">Toque num compromisso para ver os detalhes.</p>
      </div>

      <AgendaEventDetails v-if="selected" :key="selected.id" :event="selected" :day="date" class="mt-4" @close="selectedId = null" />
    </div>
  </div>
</template>
