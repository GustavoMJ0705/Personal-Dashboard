<script setup lang="ts">
import { eventEndMs, eventsOnDay } from '~/utils/agenda'
import { describeNextEvent, describeTasks, pickNextEvent } from '~/utils/dashboard'
import { isMine } from '~/utils/family'
import { groupOpenTasks } from '~/utils/tasks'

useHead({ title: 'Início' })

const { user, userId } = useAuth()
const { tasks, status: tasksStatus, ensureLoaded: ensureTasks, subscribe } = useTasks()
const { events, status: eventsStatus, ensureLoaded: ensureEvents, refreshOnVisible } = useDayEvents()
const { me, ensureLoaded: ensureFamily } = useFamily()

await Promise.all([ensureTasks(), ensureEvents(), ensureFamily()])
onMounted(subscribe)
refreshOnVisible()

const now = useNow()
const today = computed(() => toCivilDate(now.value))

const openTasks = computed(() => tasks.value.filter((task) => task.completed_at === null))
const grouped = computed(() => groupOpenTasks(openTasks.value.filter((task) => isMine(task, userId.value)), today.value))

const myEvents = computed(() => events.value.filter((event) => isMine(event, userId.value)))
const todayEvents = computed(() => eventsOnDay(events.value, today.value))
const myTodayEvents = computed(() => eventsOnDay(myEvents.value, today.value))
const upcoming = computed(() => myEvents.value.filter((event) => eventEndMs(event) >= now.value.getTime()))

const greeting = computed(() => {
  const salutation = greetingFor(now.value)
  const metadataName = (user.value?.user_metadata as { display_name?: unknown } | undefined)?.display_name
  const name = me.value?.display_name ?? (typeof metadataName === 'string' ? metadataName.trim() : '')
  return name ? `${salutation}, ${name}.` : `${salutation}.`
})

const summary = computed(() => {
  const parts: string[] = []
  if (tasksStatus.value === 'ready') parts.push(describeTasks(grouped.value.today.length, grouped.value.overdue.length))
  if (eventsStatus.value === 'ready') parts.push(describeNextEvent(pickNextEvent(upcoming.value), now.value))
  return parts.join(' ')
})
</script>

<template>
  <div>
    <header class="md:flex md:flex-col md:items-center md:text-center">
      <h1 class="font-display text-2xl font-semibold tracking-[-0.02em] text-ink md:text-3xl">{{ greeting }}</h1>

      <DashboardClock class="mt-5" :now="now" />

      <DashboardDayRuler class="mt-6 w-full md:mx-auto" :now="now" :today="today" :events="myTodayEvents" />

      <p v-if="summary" class="mt-6 max-w-[34rem] text-xl font-medium leading-snug text-ink md:text-2xl">{{ summary }}</p>
    </header>

    <div class="mt-10 flex flex-col gap-5 md:mt-12 md:gap-6">
      <DashboardTasks :today="today" :overdue="grouped.overdue" :due-today="grouped.today" />
      <DashboardEvents :events="myTodayEvents" :now="now" />
      <DashboardFamily :now="now" :today="today" :today-events="todayEvents" :open-tasks="openTasks" />
    </div>
  </div>
</template>
