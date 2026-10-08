import { DEFAULT_TIME_ZONE, isValidTimeZone, setClientTimeZone } from '~/utils/datetime'

/**
 * Fuso horário de quem usa o site, vindo do aparelho.
 * O cookie `tz` deixa o servidor renderizar já no fuso certo; na primeira visita
 * (sem cookie) o servidor usa o padrão e o cliente corrige logo depois de montar.
 */
export default defineNuxtPlugin({
  name: 'timezone',
  enforce: 'pre',
  setup(nuxtApp) {
    const cookie = useCookie<string | null>('tz', { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', default: () => null })
    const rendered = isValidTimeZone(cookie.value) ? cookie.value : DEFAULT_TIME_ZONE

    if (import.meta.client) {
      setClientTimeZone(rendered)
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (isValidTimeZone(detected) && detected !== rendered) {
        cookie.value = detected
        // Depois da hidratação, para o HTML do servidor bater com o primeiro render do cliente.
        nuxtApp.hook('app:suspense:resolve', () => setClientTimeZone(detected))
      }
    }

    return { provide: { timeZone: rendered } }
  },
})
