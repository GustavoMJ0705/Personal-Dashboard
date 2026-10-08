import type { RealtimeChannel, RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js'
import type { AgendaEvent } from '~/types/models'

export type EventsChange = RealtimePostgresChangesPayload<AgendaEvent>
type Listener = (change: EventsChange) => void

const listeners = new Set<Listener>()
let channel: RealtimeChannel | null = null

/** Registra um ouvinte de mudanças em `events`. Retorna a função para remover. */
export function onEventsChange(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function stopEventsSync(client: SupabaseClient<any>) {
  if (channel) {
    await client.removeChannel(channel)
    channel = null
  }
}

/** Um único canal para `events`, compartilhado por agenda e início. Sem filtro: o RLS decide o que chega. */
export function useEventsRealtime() {
  const client = useSupabaseClient()
  const { userId } = useAuth()

  function subscribe() {
    if (!import.meta.client || !userId.value || channel) return
    channel = client
      .channel(`events:${userId.value}`)
      .on<AgendaEvent>('postgres_changes', { event: '*', schema: 'public', table: 'events' }, (change) => {
        for (const listener of listeners) listener(change)
      })
      .subscribe()
  }

  return { subscribe }
}
