<script setup lang="ts">
import { LoaderCircle, LogOut } from 'lucide-vue-next'

const { signOut } = useAuth()
const pending = ref(false)

async function handleClick() {
  if (pending.value) return
  pending.value = true
  try {
    await signOut()
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-3 rounded text-ink-muted transition-colors hover:bg-surface hover:text-ink disabled:cursor-wait disabled:opacity-60"
    :disabled="pending"
    :aria-busy="pending"
    @click="handleClick"
  >
    <LoaderCircle v-if="pending" class="size-5 shrink-0 animate-spin" aria-hidden="true" />
    <LogOut v-else class="size-5 shrink-0" :stroke-width="1.75" aria-hidden="true" />
    <span>Sair</span>
  </button>
</template>
