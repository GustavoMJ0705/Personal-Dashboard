/** Reflete uma media query no cliente. No servidor (e antes de montar) é sempre false. */
export function useMediaQuery(query: string) {
  const matches = ref(false)
  if (import.meta.client) {
    let list: MediaQueryList | null = null
    const update = () => {
      matches.value = list?.matches ?? false
    }
    onMounted(() => {
      list = window.matchMedia(query)
      update()
      list.addEventListener('change', update)
    })
    onBeforeUnmount(() => list?.removeEventListener('change', update))
  }
  return readonly(matches)
}
