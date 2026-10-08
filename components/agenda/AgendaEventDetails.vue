<script setup lang="ts">
import { Clock3, MapPin, Pencil, Trash2, X } from 'lucide-vue-next'
import type { AgendaEvent } from '~/types/models'
import { formatEventRange } from '~/utils/agenda'
import { audienceLabel } from '~/utils/family'

const props = defineProps<{ event: AgendaEvent, day: string }>()
const emit = defineEmits<{ close: [] }>()

const { remove } = useAgenda()
const { userId } = useAuth()
const { members, family } = useFamily()

const editing = ref(false)
const confirmingDelete = ref(false)
const heading = ref<HTMLElement>()

const isCreator = computed(() => props.event.user_id === userId.value)
const forWhom = computed(() => {
  if (!family.value) return null
  return audienceLabel(props.event, members.value, userId.value) ?? 'Só você'
})
const owner = useEventOwner()
const eventOwner = computed(() => owner(props.event))

watch(() => props.event.id, () => {
  editing.value = false
  confirmingDelete.value = false
})

onMounted(() => heading.value?.focus())

function confirmDelete() {
  emit('close')
  void remove(props.event)
}
</script>

<template>
  <section aria-labelledby="detalhes-titulo" class="rounded-lg bg-surface p-4 md:p-5">
    <EventForm v-if="editing" :event="event" :day="day" class="!bg-transparent !p-0" @close="editing = false" />

    <template v-else>
      <div class="flex items-start gap-3">
        <h2 id="detalhes-titulo" ref="heading" tabindex="-1" class="min-w-0 flex-1 break-words text-lg font-semibold leading-snug text-ink focus-visible:ring-0">
          {{ event.title }}
        </h2>
        <button
          type="button"
          class="-mr-2 -mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded text-ink-muted transition-colors hover:bg-surface-strong hover:text-ink"
          aria-label="Fechar detalhes"
          @click="emit('close')"
        >
          <X class="size-5" aria-hidden="true" />
        </button>
      </div>

      <ul class="mt-3 flex flex-col gap-2 text-[15px] text-ink">
        <li class="flex items-start gap-2.5">
          <Clock3 class="mt-0.5 size-[1.125rem] shrink-0 text-ink-muted" aria-hidden="true" />
          <span class="tabular-nums">{{ formatEventRange(event) }}</span>
        </li>
        <li v-if="event.location" class="flex items-start gap-2.5">
          <MapPin class="mt-0.5 size-[1.125rem] shrink-0 text-ink-muted" aria-hidden="true" />
          <span class="break-words">{{ event.location }}</span>
        </li>
        <li v-if="forWhom" class="flex items-center gap-2.5">
          <UiAvatar :name="eventOwner?.name ?? ''" :family="eventOwner?.family ?? false" size="sm" />
          <span>{{ forWhom }}</span>
        </li>
      </ul>

      <div v-if="confirmingDelete" role="group" aria-label="Confirmar exclusão" class="mt-4 flex flex-wrap items-center gap-3 rounded bg-danger-soft px-3.5 py-3">
        <p class="mr-auto text-[15px] text-danger">Excluir este compromisso? Não dá para desfazer.</p>
        <UiButton variant="ghost" size="sm" @click="confirmingDelete = false">Cancelar</UiButton>
        <UiButton variant="danger" size="sm" @click="confirmDelete">Excluir</UiButton>
      </div>

      <div v-else class="mt-4 flex flex-wrap items-center gap-2">
        <UiButton variant="secondary" size="sm" @click="editing = true">
          <Pencil class="size-4" aria-hidden="true" />
          Editar
        </UiButton>
        <UiButton v-if="isCreator" variant="danger-ghost" size="sm" @click="confirmingDelete = true">
          <Trash2 class="size-4" aria-hidden="true" />
          Excluir
        </UiButton>
      </div>
    </template>
  </section>
</template>
