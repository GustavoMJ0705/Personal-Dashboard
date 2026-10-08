import type { AgendaEvent } from '~/types/models'
import { addDaysToCivilDate, formatCivilDate, formatTime, toCivilDate, zonedToDate } from './datetime'

/** Lista de dias civis de `first` a `last`, inclusive. */
export function daysBetween(first: string, last: string): string[] {
  const days: string[] = []
  for (let day = first; day <= last; day = addDaysToCivilDate(day, 1)) days.push(day)
  return days
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
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at) || a.title.localeCompare(b.title))
}

/** Dias (dentro da lista) que têm pelo menos um compromisso. */
export function busyDays(events: readonly AgendaEvent[]): Set<string> {
  const busy = new Set<string>()
  for (const event of events) {
    const { startDay, endDay } = eventDays(event)
    for (let day = startDay; day <= endDay; day = addDaysToCivilDate(day, 1)) busy.add(day)
  }
  return busy
}

/** Filtro da agenda: todos, só os meus, só os da família toda ou de um familiar (user id). */
export type AgendaFilter = 'all' | 'me' | 'family' | `member:${string}`

export function matchesFilter(event: AgendaEvent, filter: AgendaFilter, myId: string | null): boolean {
  if (filter === 'all') return true
  if (filter === 'family') return !!event.family_id && !event.assignee_id
  if (filter === 'me') return !event.family_id || event.assignee_id === myId
  return !!event.family_id && event.assignee_id === filter.slice('member:'.length)
}

const MINUTES_PER_DAY = 24 * 60

/** Minutos [início, fim) do evento recortados ao dia civil, no fuso de São Paulo. */
export function minutesOnDay(event: Pick<AgendaEvent, 'starts_at' | 'ends_at'>, day: string) {
  const dayStart = zonedToDate(day).getTime()
  const start = Math.max(0, (Date.parse(event.starts_at) - dayStart) / 60_000)
  const end = Math.min(MINUTES_PER_DAY, (Date.parse(event.ends_at) - dayStart) / 60_000)
  return { start, end: Math.max(end, start) }
}

export interface TimelineBlock {
  event: AgendaEvent
  start: number
  end: number
  lane: number
  left: number
  width: number
}

/**
 * Posiciona os compromissos com hora na linha do tempo do dia. Blocos curtos ganham
 * largura mínima para caber o título; a sobreposição é resolvida pela largura visual,
 * então dois blocos nunca se cobrem.
 */
export function layoutTimeline(events: readonly AgendaEvent[], day: string, hourWidth: number, minWidth: number) {
  const laneEnds: number[] = []
  const blocks: TimelineBlock[] = []

  const timed = events
    .filter((event) => !event.all_day)
    .map((event) => ({ event, ...minutesOnDay(event, day) }))
    .sort((a, b) => a.start - b.start || b.end - a.end)

  for (const item of timed) {
    const left = (item.start / 60) * hourWidth
    const width = Math.max(((item.end - item.start) / 60) * hourWidth, minWidth)
    let lane = laneEnds.findIndex((end) => end <= left + 0.5)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = left + width + 4
    blocks.push({ ...item, lane, left, width })
  }

  return { blocks, lanes: Math.max(laneEnds.length, 1) }
}

/** "18:00 – 19:00", "Dia todo" ou, se atravessa dias, "08/10 18:00 – 09/10 02:00". */
export function formatEventRange(event: AgendaEvent): string {
  const { startDay, endDay } = eventDays(event)
  if (event.all_day) {
    return startDay === endDay ? 'Dia todo' : `Dia todo, de ${formatCivilDate(startDay)} a ${formatCivilDate(endDay)}`
  }
  const start = formatTime(new Date(event.starts_at))
  const end = formatTime(new Date(event.ends_at))
  if (startDay === endDay) return `${start} – ${end}`
  return `${formatCivilDate(startDay)} ${start} – ${formatCivilDate(endDay)} ${end}`
}
