import type { Component } from 'vue'
import { BookOpen, Briefcase, House, MapPin, Plane } from 'lucide-vue-next'
import type { FamilyMember, MemberStatus } from '~/types/models'

export const STATUS_OPTIONS: ReadonlyArray<{ value: MemberStatus, label: string, icon: Component }> = [
  { value: 'at_home', label: 'Em casa', icon: House },
  { value: 'working', label: 'Trabalhando', icon: Briefcase },
  { value: 'studying', label: 'Estudando', icon: BookOpen },
  { value: 'traveling', label: 'Viajando', icon: Plane },
  { value: 'out', label: 'Fora', icon: MapPin },
]

export const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label])) as Record<MemberStatus, string>
export const STATUS_ICON = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.icon])) as Record<MemberStatus, Component>

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? '?'
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (first + last).toUpperCase()
}

/** Para quem é um item: pessoal, família toda ou pessoas específicas (uma ou mais). */
export type Audience = { kind: 'me' } | { kind: 'family' } | { kind: 'people', ids: string[] }

interface Shareable {
  family_id: string | null
  assignee_ids: string[]
}

export function assigneesOf(item: Shareable): string[] {
  return item.assignee_ids
}

export function audienceOf(item: Shareable): Audience {
  if (!item.family_id) return { kind: 'me' }
  if (item.assignee_ids.length === 0) return { kind: 'family' }
  return { kind: 'people', ids: [...item.assignee_ids] }
}

export function audienceColumns(audience: Audience, familyId: string | null): Shareable {
  if (audience.kind === 'me' || !familyId) return { family_id: null, assignee_ids: [] }
  if (audience.kind === 'family' || audience.ids.length === 0) return { family_id: familyId, assignee_ids: [] }
  return { family_id: familyId, assignee_ids: [...new Set(audience.ids)] }
}

const listFormatter = new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' })

/** "Ana", "Ana e Lucas", "você e Ana": ordem dos membros, com "você" por último. */
export function formatPeople(ids: readonly string[], members: readonly FamilyMember[], myId: string | null): string {
  const names = members.filter((m) => ids.includes(m.user_id) && m.user_id !== myId).map((m) => m.display_name)
  if (myId && ids.includes(myId)) names.push('você')
  return listFormatter.format(names)
}

/** Rótulo para itens compartilhados; null para pessoais. */
export function audienceLabel(item: Shareable, members: readonly FamilyMember[], myId: string | null): string | null {
  if (!item.family_id) return null
  const ids = assigneesOf(item).filter((id) => members.some((m) => m.user_id === id))
  if (ids.length === 0) return 'Família'
  return `Para ${formatPeople(ids, members, myId)}`
}

/** Itens do meu dia: pessoais, da família toda ou em que sou responsável. */
export function isMine(item: Shareable, myId: string | null): boolean {
  if (!item.family_id) return true
  const ids = assigneesOf(item)
  return ids.length === 0 || (!!myId && ids.includes(myId))
}

/** Itens de um membro: em que é responsável (e, para mim, também os pessoais). */
export function belongsTo(item: Shareable, memberId: string, myId: string | null): boolean {
  if (!item.family_id) return memberId === myId
  return assigneesOf(item).includes(memberId)
}
