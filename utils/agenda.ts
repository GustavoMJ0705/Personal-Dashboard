import type { AgendaEvent } from '~/types/models'
import {
  addDaysToCivilDate,
  civilWeekday,
  formatCivilDate,
  formatDayMonth,
  formatTime,
  toCivilDate,
  zonedToDate,
} from './datetime'

export type AgendaView = 'day' | 'week'

/** Semana começa na segunda-feira. */
export function weekDays(civil: string): string[] {
  const monday = addDaysToCivilDate(civil, -((civilWeekday(civil) + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => addDaysToCivilDate(monday, i))
}

export function daysInView(view: AgendaView, civil: string): string[] {
  return view === 'week' ? weekDays(civil) : [civil]
}

/** Intervalo em UTC [start, end) cobrindo os dias civis, para a consulta. */
export function rangeForDays(days: readonly string[]) {
  const first = days[0] ?? toCivilDate(new Date())
  const last = days[days.length - 1] ?? first
  return {
    start: zonedToDate(first).toISOString(),
    end: zonedToDate(addDaysToCivilDate(last, 1)).toISOString(),
  }
}

/** Dia civil de início e de fim; evento que termina exatamente à meia-noite não ocupa o dia seguinte. */
export function eventDays(event: Pick<AgendaEvent, 'starts_at' | 'ends_at'>) {
  const start = new Date(event.starts_at)
  const end = new Date(event.ends_at)
  const startDay = toCivilDate(start)
  let endDay = toCivilDate(end)
  if (endDay > startDay && formatTime(end) === '00:00') endDay = addDaysToCivilDate(endDay, -1)
  return { startDay, endDay }
}

export function eventsOnDay(events: readonly AgendaEvent[], day: string): AgendaEvent[] {
  return events
    .filter((event) => {
      const { startDay, endDay } = eventDays(event)
      return startDay <= day && day <= endDay
    })
    .sort((a, b) => {
      if (a.all_day !== b.all_day) return a.all_day ? -1 : 1
      return a.starts_at.localeCompare(b.starts_at) || a.title.localeCompare(b.title)
    })
}

/** Rótulos da coluna de horário de um evento em um dia específico. */
export function eventTimeLabels(event: AgendaEvent, day: string): { primary: string, secondary: string | null } {
  if (event.all_day) return { primary: 'Dia todo', secondary: null }
  const { startDay, endDay } = eventDays(event)
  const endTime = formatTime(new Date(event.ends_at))
  const until = endDay === day ? `até ${endTime}` : `até ${formatCivilDate(endDay)}`
  if (startDay === day) return { primary: formatTime(new Date(event.starts_at)), secondary: until }
  return { primary: 'Continua', secondary: endDay === day ? until : 'dia todo' }
}

/** "8 de outubro" para dia; "5 a 11 de outubro" ou "29 de setembro a 5 de outubro" para semana. */
export function formatWeekLabel(days: readonly string[]): string {
  const first = days[0] ?? ''
  const last = days[days.length - 1] ?? first
  if (first.slice(0, 7) === last.slice(0, 7)) return `${Number(first.slice(8))} a ${formatDayMonth(last)}`
  return `${formatDayMonth(first)} a ${formatDayMonth(last)}`
}
