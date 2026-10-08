import { stopEventsSync } from './useEventsRealtime'
import { stopFamilySync } from './useFamily'
import { stopTasksSync } from './useTasks'

const PRESERVED_STATE = new Set(['toasts', 'now'])

export function useAuth() {
  const client = useSupabaseClient()
  const user = useSupabaseUser()
  const toast = useToast()

  const userId = computed(() => user.value?.sub ?? null)

  async function signIn(email: string, password: string) {
    const { error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw error
    await navigateTo(useSupabaseCookieRedirect().pluck() ?? '/', { replace: true })
  }

  async function signOut() {
    const { error } = await client.auth.signOut()
    if (error) {
      toast.error('Não foi possível sair. Verifique a conexão e tente de novo.')
      return
    }
    await Promise.all([stopTasksSync(client), stopFamilySync(client), stopEventsSync(client)])
    clearNuxtState((key) => !PRESERVED_STATE.has(key))
    await navigateTo('/login', { replace: true })
  }

  return { user, userId, signIn, signOut }
}
