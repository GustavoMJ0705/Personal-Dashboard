export const TIME_ZONE = 'America/Sao_Paulo'
const LOCALE = 'pt-BR'

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const longDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const civilDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** "17:00" */
export function formatTime(date: Date): string {
  return timeFormatter.format(date)
}

/** "08/10/2026" */
export function formatDate(date: Date): string {
  return dateFormatter.format(date)
}

/** "quinta-feira, 8 de outubro" */
export function formatLongDate(date: Date): string {
  return longDateFormatter.format(date)
}

/** Dia civil em São Paulo no formato "yyyy-MM-dd", como em colunas `date`. */
export function toCivilDate(date: Date): string {
  return civilDateFormatter.format(date)
}

/** Soma dias a um dia civil "yyyy-MM-dd", sem passar por fuso. */
export function addDaysToCivilDate(civil: string, days: number): string {
  const [year = 1970, month = 1, day = 1] = civil.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

/** "2026-10-08" -> "08/10/2026" */
export function formatCivilDate(civil: string): string {
  const [year, month, day] = civil.split('-')
  return `${day}/${month}/${year}`
}

/** "Hoje", "Amanhã" ou "dd/MM/yyyy". */
export function formatDayLabel(civil: string, today: string): string {
  if (civil === today) return 'Hoje'
  if (civil === addDaysToCivilDate(today, 1)) return 'Amanhã'
  return formatCivilDate(civil)
}

const zonePartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

function zoneOffsetMs(date: Date): number {
  const parts: Record<string, number> = {}
  for (const part of zonePartsFormatter.formatToParts(date)) parts[part.type] = Number(part.value)
  const asUtc = Date.UTC(parts.year ?? 1970, (parts.month ?? 1) - 1, parts.day ?? 1, parts.hour ?? 0, parts.minute ?? 0, parts.second ?? 0)
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

/** Dia civil + hora "HH:mm" em São Paulo -> instante (Date em UTC). */
export function zonedToDate(civil: string, time = '00:00', seconds = 0): Date {
  const [year = 1970, month = 1, day = 1] = civil.split('-').map(Number)
  const [hour = 0, minute = 0] = time.split(':').map(Number)
  const guess = Date.UTC(year, month - 1, day, hour, minute, seconds)
  const first = guess - zoneOffsetMs(new Date(guess))
  return new Date(guess - zoneOffsetMs(new Date(first)))
}

/** Meio-dia do dia civil, para formatar nomes de dia sem risco de virada de fuso. */
export function civilToDate(civil: string): Date {
  return zonedToDate(civil, '12:00')
}

/** 0 = domingo ... 6 = sábado */
export function civilWeekday(civil: string): number {
  const [year = 1970, month = 1, day = 1] = civil.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

const dayMonthFormatter = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, day: 'numeric', month: 'long' })

/** "5 de outubro" */
export function formatDayMonth(civil: string): string {
  return dayMonthFormatter.format(civilToDate(civil))
}
