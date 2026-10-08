<script setup lang="ts">
import { CircleAlert, CircleCheck, Info, X } from 'lucide-vue-next'
import type { ToastKind } from '~/composables/useToast'

const { toasts, dismiss } = useToast()

const icons = { success: CircleCheck, error: CircleAlert, info: Info } satisfies Record<ToastKind, unknown>
const iconClass: Record<ToastKind, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-accent',
}
</script>

<template>
  <section
    aria-label="Notificações"
    class="pointer-events-none fixed inset-x-0 bottom-[calc(theme(spacing.tabbar)_+_env(safe-area-inset-bottom)_+_0.75rem)] z-40 flex justify-center px-4 md:inset-x-auto md:bottom-6 md:right-6 md:px-0"
  >
    <TransitionGroup
      tag="ol"
      aria-live="polite"
      class="flex w-full max-w-sm flex-col gap-2"
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <li
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex items-start gap-3 rounded border bg-canvas py-3 pl-4 pr-2 shadow-overlay"
      >
        <component :is="icons[toast.kind]" class="mt-0.5 size-5 shrink-0" :class="iconClass[toast.kind]" aria-hidden="true" />
        <p class="flex-1 py-px text-[15px] leading-snug text-ink">{{ toast.message }}</p>
        <button
          type="button"
          class="-my-1.5 inline-flex size-9 shrink-0 items-center justify-center rounded text-ink-subtle transition-colors hover:bg-surface hover:text-ink"
          aria-label="Fechar notificação"
          @click="dismiss(toast.id)"
        >
          <X class="size-4" aria-hidden="true" />
        </button>
      </li>
    </TransitionGroup>
  </section>
</template>
