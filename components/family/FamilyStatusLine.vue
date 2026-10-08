<script setup lang="ts">
import type { FamilyMember } from '~/types/models'
import { formatRelativeTime } from '~/utils/datetime'
import { STATUS_ICON, STATUS_LABEL } from '~/utils/family'

const props = defineProps<{ member: FamilyMember, now: Date }>()

const updated = computed(() =>
  props.member.status_updated_at ? formatRelativeTime(props.member.status_updated_at, props.now) : null,
)
</script>

<template>
  <p class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[15px]">
    <template v-if="member.status">
      <span class="inline-flex items-center gap-1.5 font-medium text-ink">
        <component :is="STATUS_ICON[member.status]" class="size-4 text-accent" aria-hidden="true" />
        {{ STATUS_LABEL[member.status] }}
      </span>
      <span v-if="member.status_note" class="text-ink-muted">{{ member.status_note }}</span>
    </template>
    <span v-else class="text-ink-muted">Sem status</span>
    <span v-if="updated && member.status" class="basis-full text-sm text-ink-muted">Atualizado {{ updated }}</span>
  </p>
</template>
