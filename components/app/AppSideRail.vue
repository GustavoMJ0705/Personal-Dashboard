<script setup lang="ts">
import { isNavItemActive, navItems, type NavItem } from '~/utils/navigation'

const route = useRoute()
const isActive = (item: NavItem) => isNavItemActive(item, route.path)
</script>

<template>
  <aside class="fixed inset-y-0 left-0 z-20 w-rail flex-col overflow-y-auto border-r bg-panel px-4 pb-6 pt-8">
    <AppWordmark class="px-3 text-2xl" />

    <nav aria-label="Principal" class="mt-10">
      <ul class="flex flex-col gap-1">
        <li v-for="item in navItems" :key="item.to">
          <NuxtLink
            :to="item.to"
            :aria-current="isActive(item) ? 'page' : undefined"
            class="relative flex h-10 items-center gap-3 rounded px-3 text-[15px] font-medium transition-colors"
            :class="isActive(item)
              ? 'bg-surface-strong text-ink'
              : 'text-ink-muted hover:bg-surface hover:text-ink'"
          >
            <span v-if="isActive(item)" class="absolute inset-y-2 -left-4 w-1 rounded-r-full bg-accent" aria-hidden="true" />
            <component
              :is="item.icon"
              class="size-5 shrink-0"
              :class="isActive(item) && 'text-accent'"
              :stroke-width="isActive(item) ? 2.25 : 1.75"
              aria-hidden="true"
            />
            {{ item.label }}
          </NuxtLink>
        </li>
      </ul>
    </nav>

    <AppMiniCalendar class="mt-10 border-t pt-6" />

    <div class="mt-auto flex flex-col gap-3 border-t pt-4">
      <div class="flex items-center justify-between gap-2 px-3">
        <span class="text-sm text-ink-muted">Tema</span>
        <AppThemeToggle compact />
      </div>
      <AppSignOutButton class="h-10 w-full px-3 text-[15px] font-medium" />
    </div>
  </aside>
</template>
