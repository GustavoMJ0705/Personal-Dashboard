import type { Task, TaskPriority } from '~/types/models'
import { addDaysToCivilDate } from './datetime'

export type OpenGroupKey = 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'undated'
export type TaskRowContext = OpenGroupKey | 'completed'

export const OPEN_GROUPS: ReadonlyArray<{ key: OpenGroupKey, label: string }> = [
  { key: 'overdue', label: 'Atrasadas' },
  { key: 'today', label: 'Hoje' },
  { key: 'tomorrow', label: 'Amanhã' },
  { key: 'upcoming', label: 'Próximas' },
  { key: 'undated', label: 'Sem data' },
]

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: 'Alta',
  normal: 'Normal',
  low: 'Baixa',
}

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, normal: 1, low: 2 }

function compareOpen(a: Task, b: Task) {
  if (a.due_date !== b.due_date) {
    if (a.due_date === null) return 1
    if (b.due_date === null) return -1
    return a.due_date < b.due_date ? -1 : 1
  }
  const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  if (byPriority !== 0) return byPriority
  return a.created_at.localeCompare(b.created_at)
}

export function groupOpenTasks(tasks: readonly Task[], today: string): Record<OpenGroupKey, Task[]> {
  const tomorrow = addDaysToCivilDate(today, 1)
  const groups: Record<OpenGroupKey, Task[]> = { overdue: [], today: [], tomorrow: [], upcoming: [], undated: [] }
  for (const task of [...tasks].sort(compareOpen)) {
    const due = task.due_date
    if (due === null) groups.undated.push(task)
    else if (due < today) groups.overdue.push(task)
    else if (due === today) groups.today.push(task)
    else if (due === tomorrow) groups.tomorrow.push(task)
    else groups.upcoming.push(task)
  }
  return groups
}

export function sortCompletedTasks(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
}

/** Adiar: dia seguinte ao vencimento, ou amanhã se já venceu ou não tem data. */
export function postponeTarget(due: string | null, today: string): string {
  return addDaysToCivilDate(due !== null && due > today ? due : today, 1)
}
