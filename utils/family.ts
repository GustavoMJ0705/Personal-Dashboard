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

/** Para quem é um item: pessoal ("me"), família toda ou um membro. */
export type Audience = 'me' | 'family' | `member:${string}`

interface Shareable {
  family_id: string | null
  assignee_id: string | null
}

export function audienceOf(item: Shareable): Audience {
  if (!item.family_id) return 'me'
  if (!item.assignee_id) return 'family'
  return `member:${item.assignee_id}`
}

export function audienceColumns(audience: Audience, familyId: string | null): Shareable {
  if (audience === 'me' || !familyId) return { family_id: null, assignee_id: null }
  if (audience === 'family') return { family_id: familyId, assignee_id: null }
  return { family_id: familyId, assignee_id: audience.slice('member:'.length) }
}

/** Rótulo para itens compartilhados; null para pessoais. */
export function audienceLabel(item: Shareable, members: readonly FamilyMember[], myId: string | null): string | null {
  if (!item.family_id) return null
  if (!item.assignee_id) return 'Família'
  if (item.assignee_id === myId) return 'Para você'
  const member = members.find((m) => m.user_id === item.assignee_id)
  return member ? `Para ${member.display_name}` : 'Família'
}

/** Itens do meu dia: pessoais, atribuídos a mim ou da família toda. */
export function isMine(item: Shareable, myId: string | null): boolean {
  return !item.family_id || !item.assignee_id || item.assignee_id === myId
}

/** Itens de um membro: atribuídos a ele (e, para mim, também os pessoais). */
export function belongsTo(item: Shareable, memberId: string, myId: string | null): boolean {
  if (!item.family_id) return memberId === myId
  return item.assignee_id === memberId
}
