import type { AgendaEvent } from '~/types/models'
import { onEventsChange } from './useEventsRealtime'

export type DayEventsStatus = 'idle' | 'loading' | 'ready' | 'error'

const LIMIT = 60
let listening = false
let reloadTimer: ReturnType<typeof setTimeout> | undefined

/** Compromissos de hoje em diante (inclui os que já passaram hoje), para o início e a família. */
export function useDayEvents() {
  const client = useSupabaseClient()

  const events = useState<AgendaEvent[]>('day-events', () => [])
  const status = useState<DayEventsStatus>('day-events:status', () => 'idle')

  async function load({ silent = false } = {}) {
    if (!silent) status.value = 'loading'
    const startOfToday = zonedToDate(toCivilDate(new Date())).toISOString()
    const { data, error } = await client
      .from('events')
      .select('*')
      .gte('ends_at', startOfToday)
      .order('starts_at', { ascending: true })
      .limit(LIMIT)
    if (error) {
      if (!silent) status.value = 'error'
      return
    }
    events.value = data
    status.value = 'ready'
  }

  async function ensureLoaded() {
    if (status.value === 'idle' || status.value === 'error') await load()
    else if (import.meta.client) void load({ silent: true })
  }

  if (import.meta.client && !listening) {
    listening = true
    onEventsChange(() => {
      clearTimeout(reloadTimer)
      reloadTimer = setTimeout(() => {
        if (status.value === 'ready') void load({ silent: true })
      }, 300)
    })
  }

  function refreshOnVisible() {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load({ silent: true })
    }
    onMounted(() => document.addEventListener('visibilitychange', onVisible))
    onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))
  }

  return { events, status, load, ensureLoaded, refreshOnVisible }
}
