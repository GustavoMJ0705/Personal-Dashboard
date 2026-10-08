<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'
import type { EventDraft } from '~/composables/useAgenda'
import type { AgendaEvent } from '~/types/models'
import { allDayRange, eventDays } from '~/utils/agenda'
import { type Audience, audienceColumns, audienceOf } from '~/utils/family'

const props = defineProps<{
  event?: AgendaEvent
  day: string
  defaultAudience?: Audience
}>()
const emit = defineEmits<{ close: [], created: [day: string] }>()

const { create, update, remove } = useAgenda()
const { userId } = useAuth()
const { family } = useFamily()
const audience = ref<Audience>(props.event ? audienceOf(props.event) : props.defaultAudience ?? { kind: 'me' })
const isCreator = computed(() => !props.event || props.event.user_id === userId.value)

function addHour(time: string) {
  const [hour = 0, minute = 0] = time.split(':').map(Number)
  return hour >= 23 ? '23:59' : `${String(hour + 1).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function initialState() {
  if (props.event) {
    const { startDay, endDay } = eventDays(props.event)
    return {
      title: props.event.title,
      allDay: props.event.all_day,
      startDate: startDay,
      startTime: props.event.all_day ? '09:00' : formatTime(new Date(props.event.starts_at)),
      endDate: endDay,
      endTime: props.event.all_day ? '10:00' : formatTime(new Date(props.event.ends_at)),
      location: props.event.location ?? '',
    }
  }
  const now = new Date()
  const nextHour = `${String(Math.min(Number(formatTime(now).slice(0, 2)) + 1, 23)).padStart(2, '0')}:00`
  const startTime = props.day === toCivilDate(now) ? nextHour : '09:00'
  return { title: '', allDay: false, startDate: props.day, startTime, endDate: props.day, endTime: addHour(startTime), location: '' }
}

const form = reactive(initialState())
const errors = reactive<{ title: string | null, range: string | null }>({ title: null, range: null })
const confirmingDelete = ref(false)
const root = ref<HTMLElement>()

const uid = props.event?.id ?? 'novo'
const fieldId = (name: string) => `evento-${uid}-${name}`

watch(() => form.startDate, (start) => {
  if (form.endDate < start) form.endDate = start
})
watch(() => form.startTime, (start) => {
  if (form.endDate === form.startDate && form.endTime <= start) form.endTime = addHour(start)
})

onMounted(() => {
  root.value?.querySelector<HTMLInputElement>(`#${CSS.escape(fieldId('titulo'))}`)?.focus()
})

function toDraft(): EventDraft | null {
  errors.title = form.title.trim() ? null : 'Escreva um título para o compromisso.'
  const complete = form.startDate && form.endDate && (form.allDay || (form.startTime && form.endTime))
  errors.range = complete ? null : 'Preencha a data e a hora de início e de fim.'
  if (errors.title || errors.range) return null

  const range = form.allDay
    ? allDayRange(form.startDate, form.endDate)
    : {
        starts_at: zonedToDate(form.startDate, form.startTime).toISOString(),
        ends_at: zonedToDate(form.endDate, form.endTime).toISOString(),
      }
  if (Date.parse(range.ends_at) < Date.parse(range.starts_at)) {
    errors.range = 'O fim precisa ser igual ou depois do início.'
    return null
  }
  return {
    title: form.title.trim(),
    all_day: form.allDay,
    ...range,
    location: form.location.trim() || null,
    ...audienceColumns(audience.value, family.value?.id ?? props.event?.family_id ?? null),
  }
}

function save() {
  const draft = toDraft()
  if (!draft) return
  emit('close')
  if (props.event) {
    void update(props.event, draft)
  } else {
    emit('created', form.startDate)
    void create(draft)
  }
}

function confirmDelete() {
  if (!props.event) return
  emit('close')
  void remove(props.event)
}
</script>

<template>
  <form
    ref="root"
    class="flex flex-col gap-4 rounded-lg bg-surface p-4"
    novalidate
    @submit.prevent="save"
    @keydown.esc.prevent="emit('close')"
  >
    <div>
      <UiTextField
        :id="fieldId('titulo')"
        v-model="form.title"
        label="Título"
        required
        :invalid="!!errors.title"
        :describedby="errors.title ? fieldId('titulo-erro') : undefined"
        @update:model-value="errors.title = null"
      />
      <p v-if="errors.title" :id="fieldId('titulo-erro')" role="alert" class="mt-1.5 text-sm text-danger">{{ errors.title }}</p>
    </div>

    <label :for="fieldId('dia-inteiro')" class="flex min-h-11 cursor-pointer items-center gap-3 self-start text-base text-ink">
      <input :id="fieldId('dia-inteiro')" v-model="form.allDay" type="checkbox" class="size-5 cursor-pointer rounded-sm accent-accent">
      Dia inteiro
    </label>

    <div class="grid gap-4" :class="form.allDay ? 'grid-cols-2' : 'grid-cols-[minmax(0,1fr)_minmax(0,8.5rem)]'">
      <UiTextField :id="fieldId('inicio')" v-model="form.startDate" label="Início" type="date" required :invalid="!!errors.range" />
      <UiTextField v-if="!form.allDay" :id="fieldId('hora-inicio')" v-model="form.startTime" label="Hora de início" type="time" required :invalid="!!errors.range" />
      <UiTextField :id="fieldId('fim')" v-model="form.endDate" label="Fim" type="date" required :invalid="!!errors.range" />
      <UiTextField v-if="!form.allDay" :id="fieldId('hora-fim')" v-model="form.endTime" label="Hora de fim" type="time" required :invalid="!!errors.range" />
    </div>
    <p v-if="errors.range" role="alert" class="-mt-2 text-sm text-danger">{{ errors.range }}</p>

    <UiTextField :id="fieldId('local')" v-model="form.location" label="Local" autocomplete="off" />

    <FamilyPeoplePicker v-if="family" :id="fieldId('para-quem')" v-model="audience" :can-make-personal="isCreator" />

    <div v-if="confirmingDelete" role="group" aria-label="Confirmar exclusão" class="flex flex-wrap items-center gap-3 rounded bg-danger-soft px-3.5 py-3">
      <p class="mr-auto text-[15px] text-danger">Excluir este compromisso? Não dá para desfazer.</p>
      <UiButton variant="ghost" size="sm" @click="confirmingDelete = false">Cancelar</UiButton>
      <UiButton variant="danger" size="sm" @click="confirmDelete">Excluir</UiButton>
    </div>

    <div v-else class="flex flex-wrap items-center gap-2">
      <UiButton v-if="event && isCreator" variant="danger-ghost" size="sm" class="-ml-3" @click="confirmingDelete = true">
        <Trash2 class="size-4" aria-hidden="true" />
        Excluir
      </UiButton>
      <UiButton variant="ghost" size="sm" class="ml-auto" @click="emit('close')">Cancelar</UiButton>
      <UiButton type="submit" size="sm">{{ event ? 'Salvar' : 'Criar compromisso' }}</UiButton>
    </div>
  </form>
</template>
