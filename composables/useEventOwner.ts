import type { AgendaEvent } from '~/types/models'
import { formatPeople } from '~/utils/family'

export interface EventOwner {
  /** Nome para o avatar (primeira pessoa) ou vazio quando é da família toda. */
  name: string
  family: boolean
  /** Quantas pessoas além da do avatar. */
  more: number
  label: string
}

/** De quem é um compromisso, para o avatar da agenda. Null quando não há família. */
export function useEventOwner() {
  const { members } = useFamily()
  const { userId } = useAuth()

  const nameOf = (id: string | null) => members.value.find((m) => m.user_id === id)?.display_name ?? ''

  return function owner(event: AgendaEvent): EventOwner | null {
    if (!members.value.length) return null
    if (!event.family_id) return { name: nameOf(userId.value), family: false, more: 0, label: 'Você' }
    const ids = event.assignee_ids.filter((id) => members.value.some((m) => m.user_id === id))
    if (ids.length === 0) return { name: '', family: true, more: 0, label: 'Família' }
    const first = ids.find((id) => id !== userId.value) ?? ids[0] ?? null
    return {
      name: nameOf(first),
      family: false,
      more: ids.length - 1,
      label: formatPeople(ids, members.value, userId.value).replace(/^você$/, 'Você'),
    }
  }
}
