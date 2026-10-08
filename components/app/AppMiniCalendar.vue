<script setup lang="ts">
import { addDaysToCivilDate, civilToDate, civilWeekday } from '~/utils/datetime'

const now = useNow()
const today = computed(() => toCivilDate(now.value))

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', month: 'long', year: 'numeric' })
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const WEEKDAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

const month = computed(() => {
  const first = `${today.value.slice(0, 8)}01`
  const leading = civilWeekday(first)
  const cells: Array<string | null> = Array.from({ length: leading }, () => null)
  for (let day = first; day.slice(0, 7) === first.slice(0, 7); day = addDaysToCivilDate(day, 1)) cells.push(day)
  return { label: monthFormatter.format(civilToDate(first)), cells }
})
</script>

<template>
  <section aria-label="Calendário do mês" class="px-3">
    <p class="text-sm font-semibold text-ink first-letter:uppercase">{{ month.label }}</p>
    <div class="mt-3 grid grid-cols-7 gap-y-1 text-center">
      <abbr
        v-for="(letter, index) in WEEKDAYS"
        :key="index"
        :title="WEEKDAY_NAMES[index]"
        class="pb-1 text-[11px] font-medium text-ink-subtle no-underline"
      >{{ letter }}</abbr>
      <template v-for="(day, index) in month.cells" :key="day ?? `vazio-${index}`">
        <span v-if="!day" aria-hidden="true" />
        <NuxtLink
          v-else
          :to="{ path: '/agenda', query: day === today ? {} : { data: day } }"
          class="mx-auto inline-flex size-7 items-center justify-center rounded-full text-[13px] tabular-nums transition-colors"
          :class="day === today
            ? 'bg-action font-semibold text-action-contrast'
            : day < today ? 'text-ink-subtle hover:bg-surface hover:text-ink' : 'text-ink-muted hover:bg-surface hover:text-ink'"
          :aria-label="`Abrir a agenda em ${formatLongDate(civilToDate(day))}`"
          :aria-current="day === today ? 'date' : undefined"
        >{{ Number(day.slice(8)) }}</NuxtLink>
      </template>
    </div>
  </section>
</template>
