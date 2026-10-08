<script setup lang="ts">
import { MapPin } from 'lucide-vue-next'
import { isTempEvent } from '~/composables/useAgenda'
import type { AgendaEvent } from '~/types/models'
import { eventTimeLabels } from '~/utils/agenda'

const props = defineProps<{
  event: AgendaEvent
  day: string
  editing: boolean
}>()
const emit = defineEmits<{ edit: [], close: [] }>()

const toggle = ref<HTMLButtonElement>()
const syncing = computed(() => isTempEvent(props.event))
const labels = computed(() => eventTimeLabels(props.event, props.day))

function closeEditor() {
  emit('close')
  nextTick(() => toggle.value?.focus())
}
</script>

<template>
  <li :aria-busy="syncing || undefined">
    <button
      ref="toggle"
      type="button"
      class="flex w-full gap-4 rounded py-3.5 text-left disabled:cursor-wait disabled:opacity-60"
      :aria-expanded="editing"
      :disabled="syncing"
      @click="editing ? closeEditor() : emit('edit')"
    >
      <span class="w-20 shrink-0 tabular-nums">
        <span class="block text-base font-medium text-ink">{{ labels.primary }}</span>
        <span v-if="labels.secondary" class="block text-sm text-ink-muted">{{ labels.secondary }}</span>
      </span>
      <span class="min-w-0 flex-1">
        <span class="block break-words text-base leading-snug text-ink">{{ event.title }}</span>
        <span v-if="event.location" class="mt-1 flex items-start gap-1.5 text-sm text-ink-muted">
          <MapPin class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span class="break-words">{{ event.location }}</span>
        </span>
      </span>
    </button>

    <EventForm v-if="editing" :event="event" :day="day" class="mb-3" @close="closeEditor" />
  </li>
</template>
