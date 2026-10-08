import type { AgendaEvent } from '~/types/models'
import { type EventsChange, onEventsChange } from './useEventsRealtime'

export type AgendaStatus = 'idle' | 'loading' | 'ready' | 'error'
export type EventDraft = Pick<
  AgendaEvent,
  'title' | 'starts_at' | 'ends_at' | 'location' | 'all_day' | 'family_id' | 'assignee_ids'
>

interface AgendaRange {
  start: string
  end: string
}

const TEMP_PREFIX = 'temp-'

const pending = new Map<string, number>()
const renderKeys = new Map<string, string>()
let requestSeq = 0
let listening = false

export const isTempEvent = (event: Pick<AgendaEvent, 'id'>) => event.id.startsWith(TEMP_PREFIX)
export const eventKey = (event: Pick<AgendaEvent, 'id'>) => renderKeys.get(event.id) ?? event.id

export function useAgenda() {
  const client = useSupabaseClient()
  const { userId } = useAuth()
  const toast = useToast()

  const events = useState<AgendaEvent[]>('agenda:events', () => [])
  const status = useState<AgendaStatus>('agenda:status', () => 'idle')
  const range = useState<AgendaRange | null>('agenda:range', () => null)

  const find = (id: string) => events.value.find((event) => event.id === id)
  const put = (row: AgendaEvent) => {
    events.value = find(row.id)
      ? events.value.map((event) => (event.id === row.id ? row : event))
      : [...events.value, row]
  }
  const drop = (id: string) => {
    events.value = events.value.filter((event) => event.id !== id)
  }
  const replaceTemp = (tempId: string, row: AgendaEvent) => {
    renderKeys.set(row.id, tempId)
    events.value = events.value.filter((event) => event.id !== row.id).map((event) => (event.id === tempId ? row : event))
  }

  function receive(change: EventsChange) {
    if (change.eventType === 'DELETE') {
      if (change.old.id && !pending.has(change.old.id)) drop(change.old.id)
      return
    }
    const row = change.new
    if (pending.has(row.id)) return
    const loaded = range.value
    if (!loaded || Date.parse(row.starts_at) >= Date.parse(loaded.end) || Date.parse(row.ends_at) < Date.parse(loaded.start)) {
      drop(row.id)
      return
    }
    const current = find(row.id)
    if (!current) {
      const temp = events.value.find((event) =>
        isTempEvent(event) && event.title === row.title && Date.parse(event.starts_at) === Date.parse(row.starts_at),
      )
      if (temp) return replaceTemp(temp.id, row)
    }
    if (current && Date.parse(row.updated_at) < Date.parse(current.updated_at)) return
    put(row)
  }

  if (import.meta.client && !listening) {
    listening = true
    onEventsChange(receive)
  }

  async function track<T>(id: string, run: () => PromiseLike<T>): Promise<T> {
    pending.set(id, (pending.get(id) ?? 0) + 1)
    try {
      return await run()
    } finally {
      const left = (pending.get(id) ?? 1) - 1
      if (left > 0) pending.set(id, left)
      else pending.delete(id)
    }
  }

  async function load(next: AgendaRange, { silent = false } = {}) {
    const seq = ++requestSeq
    range.value = next
    if (!silent) status.value = 'loading'

    const { data, error } = await client
      .from('events')
      .select('*')
      .lt('starts_at', next.end)
      .gte('ends_at', next.start)
      .order('starts_at', { ascending: true })

    if (import.meta.client && seq !== requestSeq) return
    if (error) {
      if (!silent) status.value = 'error'
      return
    }
    const local = events.value.filter((event) => isTempEvent(event) || pending.has(event.id))
    const localIds = new Set(local.map((event) => event.id))
    events.value = data.filter((event) => !localIds.has(event.id)).concat(local)
    status.value = 'ready'
  }

  /** Carrega o intervalo pedido; se já estiver carregado, atualiza em segundo plano. */
  async function ensure(next: AgendaRange) {
    const same = range.value?.start === next.start && range.value?.end === next.end
    if (!same || status.value === 'idle' || status.value === 'error') await load(next)
    else if (import.meta.client) void load(next, { silent: true })
  }

  function refreshOnVisible() {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && range.value) void load(range.value, { silent: true })
    }
    onMounted(() => document.addEventListener('visibilitychange', onVisible))
    onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))
  }

  async function create(draft: EventDraft) {
    if (!userId.value) return false
    const now = new Date().toISOString()
    const temp: AgendaEvent = {
      ...draft,
      id: `${TEMP_PREFIX}${crypto.randomUUID()}`,
      user_id: userId.value,
      created_at: now,
      updated_at: now,
    }
    events.value = [...events.value, temp]

    const { data, error } = await client.from('events').insert(draft).select().single()
    if (error) {
      drop(temp.id)
      toast.error('Não foi possível criar o compromisso. Tente de novo.')
      return false
    }
    if (find(temp.id)) replaceTemp(temp.id, data)
    return true
  }

  async function update(event: AgendaEvent, changes: EventDraft) {
    if (isTempEvent(event)) return false
    const before = find(event.id)
    if (!before) return false
    put({ ...before, ...changes })

    const { data, error } = await track(event.id, () =>
      client.from('events').update(changes).eq('id', event.id).select().single(),
    )
    if (error) {
      if (error.code === 'PGRST116') {
        drop(event.id)
        toast.error('Esse compromisso não existe mais.')
        return false
      }
      const current = find(event.id)
      if (current) {
        const restored = Object.fromEntries(Object.keys(changes).map((key) => [key, before[key as keyof AgendaEvent]]))
        put({ ...current, ...restored })
      }
      toast.error('Não foi possível salvar o compromisso. Tente de novo.')
      return false
    }
    if (!pending.has(event.id) && find(event.id)) put(data)
    return true
  }

  async function remove(event: AgendaEvent) {
    if (isTempEvent(event)) return false
    const before = find(event.id)
    if (!before) return false
    drop(event.id)

    const { error } = await track(event.id, () => client.from('events').delete().eq('id', event.id))
    if (error) {
      if (!find(event.id)) events.value = [...events.value, before]
      toast.error('Não foi possível excluir o compromisso. Tente de novo.')
      return false
    }
    return true
  }

  return { events, status, range, load, ensure, refreshOnVisible, create, update, remove }
}
