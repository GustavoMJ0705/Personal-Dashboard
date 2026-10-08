import type { AgendaEvent } from '~/types/models'
import { addDaysToCivilDate, civilWeekday, formatCivilDate, formatDayMonth, formatTime, toCivilDate, zonedToDate } from './datetime'

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

const HALF_DAY = 12 * 60 * 60 * 1000
const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/**
 * Dia civil de início e de fim. Compromisso com hora: no fuso de quem vê; se termina exatamente
 * à meia-noite, não ocupa o dia seguinte. Dia inteiro: é a mesma data para todo mundo, em qualquer
 * fuso. Novos são gravados de 00:00 a 23:59:59 UTC; os antigos, na meia-noite de São Paulo.
 * Deslocar 12 h para dentro do intervalo acerta os dois casos (qualquer fuso entre -12 h e +12 h).
 */
export function eventDays(event: Pick<AgendaEvent, 'starts_at' | 'ends_at'> & { all_day?: boolean }) {
  if (event.all_day) {
    const startDay = utcDay(Date.parse(event.starts_at) + HALF_DAY)
    const endDay = utcDay(Date.parse(event.ends_at) - HALF_DAY)
    return { startDay, endDay: endDay < startDay ? startDay : endDay }
  }
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
  if (filter === 'family') return !!event.family_id && event.assignee_ids.length === 0
  if (filter === 'me') return !event.family_id || (!!myId && event.assignee_ids.includes(myId))
  return !!event.family_id && event.assignee_ids.includes(filter.slice('member:'.length))
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
  /** Quantas faixas o grupo de sobreposição deste bloco usa (para dividir a largura na vertical). */
  groupLanes: number
  /** Posição e tamanho no eixo do tempo, em px (left/width na horizontal, top/height na vertical). */
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

  let group: TimelineBlock[] = []
  let groupEnd = -Infinity
  const closeGroup = () => {
    const lanes = Math.max(...group.map((b) => b.lane + 1), 1)
    for (const block of group) block.groupLanes = lanes
    group = []
  }

  for (const item of timed) {
    const left = (item.start / 60) * hourWidth
    const width = Math.max(((item.end - item.start) / 60) * hourWidth, minWidth)
    if (left >= groupEnd) closeGroup()
    let lane = laneEnds.findIndex((end) => end <= left + 0.5)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = left + width + 4
    const block: TimelineBlock = { ...item, lane, groupLanes: 1, left, width }
    blocks.push(block)
    group.push(block)
    groupEnd = Math.max(groupEnd, left + width + 4)
  }
  closeGroup()

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

/** Intervalo gravado para um compromisso de dia inteiro: datas civis em UTC, iguais em qualquer fuso. */
export function allDayRange(startDay: string, endDay: string) {
  return { starts_at: `${startDay}T00:00:00.000Z`, ends_at: `${endDay}T23:59:59.000Z` }
}

/** Fim do compromisso em ms: para dia inteiro, a meia-noite local depois do último dia. */
export function eventEndMs(event: Pick<AgendaEvent, 'starts_at' | 'ends_at' | 'all_day'>): number {
  if (!event.all_day) return Date.parse(event.ends_at)
  return zonedToDate(addDaysToCivilDate(eventDays(event).endDay, 1)).getTime()
}

/** Os 7 dias (segunda a domingo) da semana que contém o dia civil. */
export function weekDays(civil: string): string[] {
  const monday = addDaysToCivilDate(civil, -((civilWeekday(civil) + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => addDaysToCivilDate(monday, i))
}

/** "5 a 11 de outubro" ou "29 de setembro a 5 de outubro". */
export function formatWeekRange(days: readonly string[]): string {
  const first = days[0] ?? ''
  const last = days[days.length - 1] ?? first
  if (first.slice(0, 7) === last.slice(0, 7)) return `${Number(first.slice(8))} a ${formatDayMonth(last)}`
  return `${formatDayMonth(first)} a ${formatDayMonth(last)}`
}
