<script setup lang="ts">
import { describeNextEvent, describeTasks, pickNextEvent } from '~/utils/dashboard'
import { groupOpenTasks } from '~/utils/tasks'

useHead({ title: 'Hoje' })

const { tasks, status: tasksStatus, ensureLoaded: ensureTasks, subscribe } = useTasks()
const { events, status: eventsStatus, ensureLoaded: ensureEvents, refreshOnVisible } = useUpcomingEvents()

await Promise.all([ensureTasks(), ensureEvents()])
onMounted(subscribe)
refreshOnVisible()

const now = useNow()
const today = computed(() => toCivilDate(now.value))

const grouped = computed(() => groupOpenTasks(tasks.value.filter((task) => task.completed_at === null), today.value))
const upcoming = computed(() => events.value.filter((event) => Date.parse(event.ends_at) >= now.value.getTime()))

const summary = computed(() => {
  const parts: string[] = []
  if (tasksStatus.value === 'ready') parts.push(describeTasks(grouped.value.today.length, grouped.value.overdue.length))
  if (eventsStatus.value === 'ready') parts.push(describeNextEvent(pickNextEvent(upcoming.value), now.value))
  return parts.join(' ')
})
</script>

<template>
  <div>
    <h1 class="sr-only">Hoje</h1>

    <DashboardClock :now="now" />

    <p v-if="summary" class="mt-6 max-w-[34rem] text-xl font-medium leading-snug text-ink md:text-2xl">{{ summary }}</p>

    <div class="mt-12 flex flex-col gap-12 md:mt-14">
      <DashboardTasks :today="today" :overdue="grouped.overdue" :due-today="grouped.today" />
      <DashboardEvents :events="upcoming" :now="now" :today="today" />
    </div>
  </div>
</template>
