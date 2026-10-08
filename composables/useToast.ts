export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
}

const DURATION: Record<ToastKind, number> = {
  success: 3500,
  info: 4000,
  error: 6000,
}

let nextId = 1
const timers = new Map<number, ReturnType<typeof setTimeout>>()

export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])

  function dismiss(id: number) {
    clearTimeout(timers.get(id))
    timers.delete(id)
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function show(message: string, kind: ToastKind = 'info') {
    if (!import.meta.client) return
    const id = nextId++
    toasts.value = [...toasts.value.slice(-2), { id, kind, message }]
    timers.set(id, setTimeout(() => dismiss(id), DURATION[kind]))
    return id
  }

  return {
    toasts: readonly(toasts),
    show,
    dismiss,
    success: (message: string) => show(message, 'success'),
    error: (message: string) => show(message, 'error'),
    info: (message: string) => show(message, 'info'),
  }
}
