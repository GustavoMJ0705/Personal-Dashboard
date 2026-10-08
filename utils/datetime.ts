import { ref } from 'vue'

/** Fuso usado até o aparelho informar o dele (primeira visita) e como reserva. */
export const DEFAULT_TIME_ZONE = 'America/Sao_Paulo'
const LOCALE = 'pt-BR'

// No cliente há um só app: o fuso fica num ref, e tudo que formata data reage à troca.
// No servidor cada requisição tem o seu, lido do NuxtApp (plugin timezone).
const clientTimeZone = ref(DEFAULT_TIME_ZONE)

export function isValidTimeZone(zone: unknown): zone is string {
  if (typeof zone !== 'string' || !zone) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
    return true
  } catch {
    return false
  }
}

export function setClientTimeZone(zone: string) {
  clientTimeZone.value = zone
}

/** Fuso de quem está usando o site (o do aparelho). */
export function currentTimeZone(): string {
  if (import.meta.client) return clientTimeZone.value
  const zone = (tryUseNuxtApp() as { $timeZone?: string } | null)?.$timeZone
  return zone ?? DEFAULT_TIME_ZONE
}

const formatters = new Map<string, Intl.DateTimeFormat>()

/** Intl.DateTimeFormat no fuso atual, reaproveitado por fuso. */
export function zonedFormatter(name: string, options: Intl.DateTimeFormatOptions, locale = LOCALE) {
  const zone = currentTimeZone()
  const key = `${name}|${locale}|${zone}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { ...options, timeZone: zone })
    formatters.set(key, formatter)
  }
  return formatter
}

const TIME: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
const DATE: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
const LONG_DATE: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }
const CIVIL: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' }
const PARTS: Intl.DateTimeFormatOptions = {
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
}

/** "17:00" */
export function formatTime(date: Date): string {
  return zonedFormatter('time', TIME).format(date)
}

/** "08/10/2026" */
export function formatDate(date: Date): string {
  return zonedFormatter('date', DATE).format(date)
}

/** "quinta-feira, 8 de outubro" */
export function formatLongDate(date: Date): string {
  return zonedFormatter('long-date', LONG_DATE).format(date)
}

/** Dia civil no fuso atual, no formato "yyyy-MM-dd", como em colunas `date`. */
export function toCivilDate(date: Date): string {
  return zonedFormatter('civil', CIVIL, 'en-CA').format(date)
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

function zoneOffsetMs(date: Date): number {
  const parts: Record<string, number> = {}
  for (const part of zonedFormatter('parts', PARTS, 'en-US').formatToParts(date)) parts[part.type] = Number(part.value)
  const asUtc = Date.UTC(parts.year ?? 1970, (parts.month ?? 1) - 1, parts.day ?? 1, parts.hour ?? 0, parts.minute ?? 0, parts.second ?? 0)
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

/** Dia civil + hora "HH:mm" no fuso atual -> instante (Date em UTC). */
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

/** "5 de outubro" */
export function formatDayMonth(civil: string): string {
  return zonedFormatter('day-month', { day: 'numeric', month: 'long' }).format(civilToDate(civil))
}

/** "agora mesmo", "há 5 min", "há 3 h", "ontem às 18:40" ou "em 02/10/2026". */
export function formatRelativeTime(iso: string, now: Date): string {
  const date = new Date(iso)
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000)
  if (minutes < 1) return 'agora mesmo'
  if (minutes < 60) return `há ${minutes} min`
  const today = toCivilDate(now)
  const day = toCivilDate(date)
  if (day === today) return `há ${Math.floor(minutes / 60)} h`
  if (day === addDaysToCivilDate(today, -1)) return `ontem às ${formatTime(date)}`
  return `em ${formatDate(date)}`
}

/** "Bom dia", "Boa tarde" ou "Boa noite" pelo horário local. */
export function greetingFor(date: Date): string {
  const hour = Number(formatTime(date).slice(0, 2))
  if (hour >= 5 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 18) return 'Boa tarde'
  return 'Boa noite'
}
