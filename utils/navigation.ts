import type { Component } from 'vue'
import { CalendarDays, House, ListChecks, Users } from 'lucide-vue-next'

export interface NavItem {
  to: string
  label: string
  icon: Component
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Início', icon: House },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/tarefas', label: 'Tarefas', icon: ListChecks },
  { to: '/familia', label: 'Família', icon: Users },
]

export function isNavItemActive(item: NavItem, path: string) {
  return item.to === '/' ? path === '/' : path === item.to || path.startsWith(`${item.to}/`)
}
