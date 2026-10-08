<script setup lang="ts">
import { isNavItemActive, navItems, type NavItem } from '~/utils/navigation'

const route = useRoute()
const isActive = (item: NavItem) => isNavItemActive(item, route.path)
</script>

<template>
  <aside class="fixed inset-y-0 left-0 z-20 w-rail flex-col border-r bg-canvas px-4 pb-6 pt-8">
    <AppWordmark class="px-3 text-2xl" />

    <nav aria-label="Principal" class="mt-10">
      <ul class="flex flex-col gap-1">
        <li v-for="item in navItems" :key="item.to">
          <NuxtLink
            :to="item.to"
            :aria-current="isActive(item) ? 'page' : undefined"
            class="flex h-10 items-center gap-3 rounded px-3 text-[15px] font-medium transition-colors"
            :class="isActive(item)
              ? 'bg-accent-soft text-accent'
              : 'text-ink-muted hover:bg-surface hover:text-ink'"
          >
            <component :is="item.icon" class="size-5 shrink-0" :stroke-width="isActive(item) ? 2.25 : 1.75" aria-hidden="true" />
            {{ item.label }}
          </NuxtLink>
        </li>
      </ul>
    </nav>

    <div class="mt-auto border-t pt-4">
      <AppSignOutButton class="h-10 w-full px-3 text-[15px] font-medium" />
    </div>
  </aside>
</template>
