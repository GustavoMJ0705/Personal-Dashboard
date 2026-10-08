import type { Component } from 'vue'
import { CalendarDays, House, ListChecks } from 'lucide-vue-next'

export interface NavItem {
  to: string
  label: string
  icon: Component
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Hoje', icon: House },
  { to: '/tarefas', label: 'Tarefas', icon: ListChecks },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
]

export function isNavItemActive(item: NavItem, path: string) {
  return item.to === '/' ? path === '/' : path === item.to || path.startsWith(`${item.to}/`)
}
