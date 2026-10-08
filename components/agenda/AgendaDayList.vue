<script setup lang="ts">
import { MapPin } from 'lucide-vue-next'
import { eventKey } from '~/composables/useAgenda'
import type { AgendaEvent } from '~/types/models'
import { eventEndMs, formatEventRange } from '~/utils/agenda'

const props = defineProps<{ events: AgendaEvent[], selectedId: string | null, now: Date }>()
const emit = defineEmits<{ select: [event: AgendaEvent] }>()

const owner = useEventOwner()
const isPast = (event: AgendaEvent) => eventEndMs(event) < props.now.getTime()
</script>

<template>
  <ol class="flex flex-col gap-1.5">
    <li v-for="event in events" :key="eventKey(event)">
      <button
        type="button"
        class="flex w-full items-start gap-3 rounded border px-3 py-2.5 text-left transition-colors"
        :class="selectedId === event.id
          ? 'border-action bg-action text-action-contrast'
          : 'border-transparent hover:border-line hover:bg-surface'"
        :aria-pressed="selectedId === event.id"
        @click="emit('select', event)"
      >
        <span
          class="w-[6.5rem] shrink-0 pt-px text-sm font-medium tabular-nums"
          :class="selectedId === event.id ? 'text-action-contrast' : isPast(event) ? 'text-ink-subtle' : 'text-accent'"
        >{{ formatEventRange(event) }}</span>
        <span class="min-w-0 flex-1">
          <span class="block break-words text-[15px] font-medium leading-snug" :class="selectedId !== event.id && isPast(event) && 'text-ink-muted'">
            {{ event.title }}
          </span>
          <span
            v-if="event.location || owner(event)"
            class="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-sm"
            :class="selectedId === event.id ? 'text-action-contrast/80' : 'text-ink-muted'"
          >
            <span v-if="event.location" class="inline-flex items-center gap-1">
              <MapPin class="size-3.5 shrink-0" aria-hidden="true" />
              <span class="truncate">{{ event.location }}</span>
            </span>
            <span v-if="owner(event)">{{ owner(event)!.label }}</span>
          </span>
        </span>
      </button>
    </li>
  </ol>
</template>
