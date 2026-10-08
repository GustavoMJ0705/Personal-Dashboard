import type { RealtimeChannel, RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js'
import type { Family, FamilyMember, MemberStatus } from '~/types/models'

export type FamilyStatus = 'idle' | 'loading' | 'ready' | 'error'

let channel: RealtimeChannel | null = null
let onVisibilityChange: (() => void) | null = null

export async function stopFamilySync(client: SupabaseClient<any>) {
  if (channel) {
    await client.removeChannel(channel)
    channel = null
  }
  if (onVisibilityChange) {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    onVisibilityChange = null
  }
}

const RPC_ERRORS: Record<string, string> = {
  user_not_found: 'Não existe conta com esse e-mail. Peça para a pessoa criar a conta primeiro.',
  already_in_family: 'Essa pessoa já faz parte de uma família.',
  not_owner: 'Só o dono da família pode adicionar membros.',
}

function describeRpcError(error: { message?: string } | null, fallback: string) {
  return (error?.message && RPC_ERRORS[error.message]) || fallback
}

export function useFamily() {
  const client = useSupabaseClient()
  const { userId } = useAuth()
  const toast = useToast()

  const family = useState<Family | null>('family', () => null)
  const members = useState<FamilyMember[]>('family:members', () => [])
  const status = useState<FamilyStatus>('family:status', () => 'idle')

  const me = computed(() => members.value.find((m) => m.user_id === userId.value) ?? null)
  const isOwner = computed(() => !!family.value && family.value.user_id === userId.value)
  const others = computed(() => members.value.filter((m) => m.user_id !== userId.value))

  const putMember = (row: FamilyMember) => {
    members.value = members.value.some((m) => m.id === row.id)
      ? members.value.map((m) => (m.id === row.id ? row : m))
      : [...members.value, row]
  }
  const dropMember = (id: string) => {
    members.value = members.value.filter((m) => m.id !== id)
  }

  async function load({ silent = false } = {}) {
    if (!silent) status.value = 'loading'
    const [membersResult, familyResult] = await Promise.all([
      client.from('family_members').select('*').order('created_at', { ascending: true }),
      client.from('families').select('*').maybeSingle(),
    ])
    if (membersResult.error || familyResult.error) {
      if (!silent) status.value = 'error'
      return
    }
    members.value = membersResult.data
    family.value = familyResult.data
    status.value = 'ready'
  }

  async function ensureLoaded() {
    if (status.value === 'idle' || status.value === 'error') await load()
    else if (import.meta.client) void load({ silent: true })
  }

  function handleChange(payload: RealtimePostgresChangesPayload<FamilyMember>) {
    if (payload.eventType === 'DELETE') {
      const removed = members.value.find((m) => m.id === payload.old.id)
      if (removed?.user_id === userId.value) void load({ silent: true })
      else if (payload.old.id) dropMember(payload.old.id)
      return
    }
    if (payload.eventType === 'INSERT' && !family.value) {
      void load({ silent: true })
      return
    }
    putMember(payload.new)
  }

  function subscribe() {
    if (!import.meta.client || !userId.value) return
    if (!channel) {
      channel = client
        .channel(`family:${userId.value}`)
        .on<FamilyMember>('postgres_changes', { event: '*', schema: 'public', table: 'family_members' }, handleChange)
        .subscribe()
    }
    if (!onVisibilityChange) {
      onVisibilityChange = () => {
        if (document.visibilityState === 'visible') void load({ silent: true })
      }
      document.addEventListener('visibilitychange', onVisibilityChange)
    }
  }

  /** Retorna a mensagem de erro, ou null se deu certo. */
  async function createFamily(name: string, displayName: string): Promise<string | null> {
    const { error } = await client.rpc('create_family', {
      family_name: name.trim(),
      member_display_name: displayName.trim(),
    })
    if (error) return describeRpcError(error, 'Não foi possível criar a família. Tente de novo.')
    await load({ silent: true })
    return null
  }

  async function addMember(email: string, displayName: string): Promise<string | null> {
    const { error } = await client.rpc('add_family_member', {
      member_email: email.trim(),
      member_display_name: displayName.trim(),
    })
    if (error) return describeRpcError(error, 'Não foi possível adicionar o membro. Tente de novo.')
    await load({ silent: true })
    toast.success(`${displayName.trim()} agora faz parte da família.`)
    return null
  }

  async function patchMe(changes: Partial<Pick<FamilyMember, 'display_name' | 'status' | 'status_note'>>, failure: string) {
    const before = me.value
    if (!before) return false
    const touchesStatus = 'status' in changes || 'status_note' in changes
    putMember({ ...before, ...changes, ...(touchesStatus ? { status_updated_at: new Date().toISOString() } : {}) })

    const { data, error } = await client.from('family_members').update(changes).eq('id', before.id).select().single()
    if (error) {
      putMember(before)
      toast.error(failure)
      return false
    }
    putMember(data)
    return true
  }

  function setMyStatus(next: MemberStatus | null, note?: string | null) {
    const changes: Partial<Pick<FamilyMember, 'status' | 'status_note'>> = { status: next }
    if (note !== undefined) changes.status_note = note?.trim() || null
    if (next === null) changes.status_note = null
    return patchMe(changes, 'Não foi possível atualizar seu status. Tente de novo.')
  }

  function setMyNote(note: string) {
    return patchMe({ status_note: note.trim() || null }, 'Não foi possível salvar a nota. Tente de novo.')
  }

  function renameMe(displayName: string) {
    const name = displayName.trim()
    if (!name) return Promise.resolve(false)
    return patchMe({ display_name: name }, 'Não foi possível salvar seu nome. Tente de novo.')
  }

  async function removeMember(member: FamilyMember) {
    dropMember(member.id)
    const { error } = await client.from('family_members').delete().eq('id', member.id)
    if (error) {
      putMember(member)
      toast.error(`Não foi possível remover ${member.display_name}. Tente de novo.`)
      return false
    }
    toast.success(`${member.display_name} saiu da família.`)
    return true
  }

  return {
    family,
    members,
    status,
    me,
    isOwner,
    others,
    load,
    ensureLoaded,
    subscribe,
    createFamily,
    addMember,
    setMyStatus,
    setMyNote,
    renameMe,
    removeMember,
  }
}
