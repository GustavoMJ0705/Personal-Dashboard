const clientNow = ref<string | null>(null)
let ticking = false

export function useNow() {
  const initial = useState('now', () => new Date().toISOString())

  if (import.meta.client && !ticking) {
    ticking = true
    onMounted(() => {
      const tick = () => {
        const now = new Date()
        clientNow.value = now.toISOString()
        setTimeout(tick, 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 20)
      }
      tick()
    })
  }

  return computed(() => new Date(clientNow.value ?? initial.value))
}
