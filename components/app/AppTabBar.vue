<script setup lang="ts">
import { isNavItemActive, navItems, type NavItem } from '~/utils/navigation'

const route = useRoute()
const isActive = (item: NavItem) => isNavItemActive(item, route.path)
</script>

<template>
  <nav aria-label="Principal" class="fixed inset-x-0 bottom-0 z-30 border-t bg-panel pb-[env(safe-area-inset-bottom)]">
    <ul class="flex">
      <li v-for="item in navItems" :key="item.to" class="flex-1">
        <NuxtLink
          :to="item.to"
          :aria-current="isActive(item) ? 'page' : undefined"
          class="relative flex h-tabbar flex-col items-center justify-center gap-1 text-xs transition-colors"
          :class="isActive(item) ? 'font-semibold text-ink' : 'font-medium text-ink-muted'"
        >
          <span v-if="isActive(item)" class="absolute inset-x-6 top-0 h-0.5 rounded-b-full bg-accent" aria-hidden="true" />
          <component
            :is="item.icon"
            class="size-6"
            :class="isActive(item) && 'text-accent'"
            :stroke-width="isActive(item) ? 2.25 : 1.75"
            aria-hidden="true"
          />
          {{ item.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
