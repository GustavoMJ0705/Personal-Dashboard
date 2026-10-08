import type { AgendaEvent } from '~/types/models'

export type UpcomingEventsStatus = 'idle' | 'loading' | 'ready' | 'error'

const UPCOMING_LIMIT = 5

export function useUpcomingEvents() {
  const client = useSupabaseClient()

  const events = useState<AgendaEvent[]>('upcoming-events', () => [])
  const status = useState<UpcomingEventsStatus>('upcoming-events:status', () => 'idle')

  async function load({ silent = false } = {}) {
    if (!silent) status.value = 'loading'
    const { data, error } = await client
      .from('events')
      .select('*')
      .gte('ends_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(UPCOMING_LIMIT)
    if (error) {
      if (!silent) status.value = 'error'
      return
    }
    events.value = data
    status.value = 'ready'
  }

  /** Primeira carga bloqueia (SSR); nas visitas seguintes atualiza em segundo plano. */
  async function ensureLoaded() {
    if (status.value === 'idle' || status.value === 'error') await load()
    else if (import.meta.client) void load({ silent: true })
  }

  /** Recarrega em silêncio quando o app volta ao primeiro plano, enquanto o componente estiver montado. */
  function refreshOnVisible() {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load({ silent: true })
    }
    onMounted(() => document.addEventListener('visibilitychange', onVisible))
    onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))
  }

  return { events, status, load, ensureLoaded, refreshOnVisible }
}
