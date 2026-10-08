export type ThemePreference = 'light' | 'dark' | 'system'

const THEME_COLORS = { light: '#FFFFFF', dark: '#000000' } as const

/** Tema em cookie para o servidor já renderizar certo, sem piscar. */
export function useTheme() {
  const preference = useCookie<ThemePreference>('theme', {
    default: () => 'system',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  function set(next: ThemePreference) {
    preference.value = next
  }

  /** Aplica o tema no <html> e a cor da barra do navegador. Chamar uma vez, no app.vue. */
  function apply() {
    useHead(() => ({
      htmlAttrs: { 'data-theme': preference.value },
      meta: preference.value === 'system'
        ? [
            { key: 'theme-light', name: 'theme-color', content: THEME_COLORS.light, media: '(prefers-color-scheme: light)' },
            { key: 'theme-dark', name: 'theme-color', content: THEME_COLORS.dark, media: '(prefers-color-scheme: dark)' },
          ]
        : [{ key: 'theme-light', name: 'theme-color', content: THEME_COLORS[preference.value] }],
    }))
  }

  return { preference, set, apply }
}
