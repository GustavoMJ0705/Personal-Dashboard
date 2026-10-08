import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

const token = (name: string) => `rgb(var(--color-${name}) / <alpha-value>)`

export default {
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      canvas: token('canvas'),
      surface: {
        DEFAULT: token('surface'),
        strong: token('surface-strong'),
      },
      ink: {
        DEFAULT: token('ink'),
        muted: token('ink-muted'),
        subtle: token('ink-subtle'),
      },
      line: {
        DEFAULT: token('line'),
        strong: token('line-strong'),
      },
      accent: {
        DEFAULT: token('accent'),
        hover: token('accent-hover'),
        soft: token('accent-soft'),
        contrast: token('accent-contrast'),
      },
      success: {
        DEFAULT: token('success'),
        soft: token('success-soft'),
      },
      warning: {
        DEFAULT: token('warning'),
        soft: token('warning-soft'),
      },
      danger: {
        DEFAULT: token('danger'),
        soft: token('danger-soft'),
      },
    },
    borderRadius: {
      none: '0',
      sm: '6px',
      DEFAULT: '10px',
      lg: '16px',
      full: '9999px',
    },
    extend: {
      fontFamily: {
        sans: ['"Instrument Sans"', ...defaultTheme.fontFamily.sans],
        display: ['"Bricolage Grotesque"', ...defaultTheme.fontFamily.sans],
      },
      borderColor: {
        DEFAULT: token('line'),
      },
      ringOffsetColor: {
        DEFAULT: token('canvas'),
      },
      spacing: {
        rail: '15rem',
        tabbar: '4rem',
      },
      boxShadow: {
        overlay: '0 1px 2px rgb(var(--color-ink) / 0.06), 0 8px 24px -8px rgb(var(--color-ink) / 0.18)',
      },
      maxWidth: {
        content: '44rem',
      },
    },
  },
} satisfies Partial<Config>
