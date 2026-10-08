import { eventDays } from './agenda'
import type { AgendaEvent } from '~/types/models'
import { addDaysToCivilDate, formatCivilDate, formatTime, toCivilDate } from './datetime'

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function describeTasks(today: number, overdue: number): string {
  if (today > 0 && overdue > 0) {
    return `${count(today, 'tarefa', 'tarefas')} para hoje e ${count(overdue, 'atrasada', 'atrasadas')}.`
  }
  if (today > 0) return `${count(today, 'tarefa', 'tarefas')} para hoje.`
  if (overdue > 0) return `Nada novo para hoje, mas ${count(overdue, 'tarefa atrasada', 'tarefas atrasadas')}.`
  return 'Nenhuma tarefa para hoje.'
}

export const isEventOngoing = (event: AgendaEvent, now: Date) =>
  Date.parse(event.starts_at) <= now.getTime() && Date.parse(event.ends_at) >= now.getTime()

/** Prefere o próximo compromisso com hora; o de dia inteiro só entra se não houver outro. */
export function pickNextEvent(events: readonly AgendaEvent[]): AgendaEvent | undefined {
  return events.find((event) => !event.all_day) ?? events[0]
}

export function describeNextEvent(event: AgendaEvent | undefined, now: Date): string {
  if (!event) return 'Nenhum compromisso pela frente.'

  const start = new Date(event.starts_at)
  const today = toCivilDate(now)
  const day = event.all_day ? eventDays(event).startDay : toCivilDate(start)

  if (event.all_day) {
    if (day <= today) return `Hoje, o dia todo: ${event.title}.`
    const when = day === addDaysToCivilDate(today, 1) ? 'amanhã' : `em ${formatCivilDate(day)}`
    return `Próximo compromisso ${when}, o dia todo: ${event.title}.`
  }
  if (isEventOngoing(event, now)) return `Agora: ${event.title}, até ${formatTime(new Date(event.ends_at))}.`
  if (day === today) return `Próximo compromisso às ${formatTime(start)}: ${event.title}.`
  const when = day === addDaysToCivilDate(today, 1) ? 'amanhã' : `em ${formatCivilDate(day)}`
  return `Próximo compromisso ${when} às ${formatTime(start)}: ${event.title}.`
}
