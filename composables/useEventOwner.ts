import type { AgendaEvent } from '~/types/models'

/** De quem é um compromisso, para o avatar da agenda. Null quando não há família. */
export function useEventOwner() {
  const { members } = useFamily()
  const { userId } = useAuth()

  return function owner(event: AgendaEvent) {
    if (!members.value.length) return null
    if (!event.family_id) {
      const name = members.value.find((m) => m.user_id === userId.value)?.display_name ?? ''
      return { name, family: false, label: 'Você' }
    }
    if (!event.assignee_id) return { name: '', family: true, label: 'Família' }
    const name = members.value.find((m) => m.user_id === event.assignee_id)?.display_name ?? ''
    return { name, family: !name, label: event.assignee_id === userId.value ? 'Você' : name || 'Família' }
  }
}
