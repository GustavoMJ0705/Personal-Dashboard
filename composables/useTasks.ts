import type { RealtimeChannel, RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js'
import type { Task, TaskPriority } from '~/types/models'
import { addDaysToCivilDate, formatCivilDate, toCivilDate } from '~/utils/datetime'
import { postponeTarget } from '~/utils/tasks'

export type TasksStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface TaskDraft {
  title: string
  due_date: string | null
  description?: string | null
  priority?: TaskPriority
  family_id?: string | null
  assignee_ids?: string[]
}

export type TaskEdit = Pick<Task, 'title' | 'description' | 'due_date' | 'priority' | 'family_id' | 'assignee_ids'>
type TaskPatch = Partial<TaskEdit & Pick<Task, 'completed_at'>>

const TEMP_PREFIX = 'temp-'
const COMPLETED_LIMIT = 100

const pending = new Map<string, number>()
const renderKeys = new Map<string, string>()
let channel: RealtimeChannel | null = null
let channelStatus: string | null = null
let onVisibilityChange: (() => void) | null = null

export const isTempTask = (task: Pick<Task, 'id'>) => task.id.startsWith(TEMP_PREFIX)

/** Chave de renderização estável: a linha real herda a chave da temporária. */
export const taskKey = (task: Pick<Task, 'id'>) => renderKeys.get(task.id) ?? task.id

/** Encerra Realtime e listeners. Chamado no logout. */
export async function stopTasksSync(client: SupabaseClient<any>) {
  if (channel) {
    await client.removeChannel(channel)
    channel = null
    channelStatus = null
  }
  if (onVisibilityChange) {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    onVisibilityChange = null
  }
  pending.clear()
  renderKeys.clear()
}

export function useTasks() {
  const client = useSupabaseClient()
  const { userId } = useAuth()
  const toast = useToast()

  const tasks = useState<Task[]>('tasks', () => [])
  const status = useState<TasksStatus>('tasks:status', () => 'idle')

  const find = (id: string) => tasks.value.find((task) => task.id === id)
  const put = (row: Task) => {
    tasks.value = find(row.id)
      ? tasks.value.map((task) => (task.id === row.id ? row : task))
      : [...tasks.value, row]
  }
  const drop = (id: string) => {
    tasks.value = tasks.value.filter((task) => task.id !== id)
  }
  const replaceTemp = (tempId: string, row: Task) => {
    renderKeys.set(row.id, tempId)
    tasks.value = tasks.value.filter((task) => task.id !== row.id).map((task) => (task.id === tempId ? row : task))
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

  async function load({ silent = false } = {}) {
    if (!silent) status.value = 'loading'
    const [open, done] = await Promise.all([
      client.from('tasks').select('*').is('completed_at', null),
      client
        .from('tasks')
        .select('*')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(COMPLETED_LIMIT),
    ])
    if (open.error || done.error) {
      if (!silent) status.value = 'error'
      return
    }
    const local = tasks.value.filter((task) => isTempTask(task) || pending.has(task.id))
    const localIds = new Set(local.map((task) => task.id))
    tasks.value = [...open.data, ...done.data].filter((task) => !localIds.has(task.id)).concat(local)
    status.value = 'ready'
  }

  async function ensureLoaded() {
    if (status.value === 'idle' || status.value === 'error') await load()
  }

  function receive(row: Task) {
    if (pending.has(row.id)) return
    const current = find(row.id)
    if (!current) {
      const temp = tasks.value.find((task) =>
        isTempTask(task) && task.title === row.title && task.due_date === row.due_date && task.priority === row.priority,
      )
      if (temp) return replaceTemp(temp.id, row)
    }
    if (current && Date.parse(row.updated_at) < Date.parse(current.updated_at)) return
    put(row)
  }

  function handleChange(payload: RealtimePostgresChangesPayload<Task>) {
    if (payload.eventType === 'DELETE') {
      if (payload.old.id && !pending.has(payload.old.id)) drop(payload.old.id)
      return
    }
    receive(payload.new)
  }

  function openChannel() {
    if (!userId.value) return
    // Sem filtro por user_id: tarefas da família também chegam, e o RLS limita o resto.
    channel = client
      .channel(`tasks:${userId.value}`)
      .on<Task>('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, handleChange)
      .subscribe((state) => {
        channelStatus = state
      })
  }

  /** Liga Realtime e a recarga ao voltar para o app. Idempotente; só no cliente. */
  function subscribe() {
    if (!import.meta.client || !userId.value) return
    if (!channel) openChannel()
    if (!onVisibilityChange) {
      onVisibilityChange = () => {
        if (document.visibilityState !== 'visible') return
        void load({ silent: true })
        if (channel && channelStatus !== 'SUBSCRIBED') {
          void client.removeChannel(channel)
          channel = null
          openChannel()
        }
      }
      document.addEventListener('visibilitychange', onVisibilityChange)
    }
  }

  async function create(draft: TaskDraft) {
    const title = draft.title.trim()
    if (!title || !userId.value) return false

    const now = new Date().toISOString()
    const temp: Task = {
      id: `${TEMP_PREFIX}${crypto.randomUUID()}`,
      user_id: userId.value,
      title,
      description: draft.description ?? null,
      due_date: draft.due_date,
      priority: draft.priority ?? 'normal',
      family_id: draft.family_id ?? null,
      assignee_ids: draft.assignee_ids ?? [],
      completed_at: null,
      created_at: now,
      updated_at: now,
    }
    tasks.value = [...tasks.value, temp]

    const { data, error } = await client
      .from('tasks')
      .insert({
        title,
        description: temp.description,
        due_date: temp.due_date,
        priority: temp.priority,
        family_id: temp.family_id,
        assignee_ids: temp.assignee_ids,
      })
      .select()
      .single()

    if (error) {
      drop(temp.id)
      toast.error('Não foi possível criar a tarefa. Tente de novo.')
      return false
    }
    if (find(temp.id)) replaceTemp(temp.id, data)
    return true
  }

  async function patch(task: Task, changes: TaskPatch, failure: string) {
    if (isTempTask(task)) return false
    const before = find(task.id)
    if (!before) return false
    put({ ...before, ...changes })

    const { data, error } = await track(task.id, () =>
      client.from('tasks').update(changes).eq('id', task.id).select().single(),
    )

    if (error) {
      if (error.code === 'PGRST116') {
        drop(task.id)
        toast.error('Essa tarefa não existe mais.')
        return false
      }
      const current = find(task.id)
      if (current) {
        const restored = Object.fromEntries(Object.keys(changes).map((key) => [key, before[key as keyof Task]]))
        put({ ...current, ...restored })
      }
      toast.error(failure)
      return false
    }
    if (!pending.has(task.id) && find(task.id)) put(data)
    return true
  }

  function toggleComplete(task: Task) {
    const completing = !task.completed_at
    return patch(
      task,
      { completed_at: completing ? new Date().toISOString() : null },
      completing ? 'Não foi possível concluir a tarefa. Tente de novo.' : 'Não foi possível reabrir a tarefa. Tente de novo.',
    )
  }

  function update(task: Task, edit: TaskEdit) {
    return patch(task, edit, 'Não foi possível salvar a tarefa. Tente de novo.')
  }

  async function postpone(task: Task) {
    const today = toCivilDate(new Date())
    const target = postponeTarget(task.due_date, today)
    const ok = await patch(task, { due_date: target }, 'Não foi possível adiar a tarefa. Tente de novo.')
    if (ok) {
      toast.success(target === addDaysToCivilDate(today, 1) ? 'Adiada para amanhã.' : `Adiada para ${formatCivilDate(target)}.`)
    }
    return ok
  }

  async function remove(task: Task) {
    if (isTempTask(task)) return false
    const before = find(task.id)
    if (!before) return false
    drop(task.id)

    const { error } = await track(task.id, () => client.from('tasks').delete().eq('id', task.id))
    if (error) {
      if (!find(task.id)) tasks.value = [...tasks.value, before]
      toast.error('Não foi possível excluir a tarefa. Tente de novo.')
      return false
    }
    return true
  }

  return {
    tasks,
    status,
    load,
    ensureLoaded,
    subscribe,
    create,
    toggleComplete,
    update,
    postpone,
    remove,
  }
}
