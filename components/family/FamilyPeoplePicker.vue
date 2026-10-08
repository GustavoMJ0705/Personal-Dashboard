<script setup lang="ts">
import { Plus, X } from 'lucide-vue-next'
import type { TaskAudience } from '~/utils/family'

const props = withDefaults(defineProps<{ id: string, canMakePersonal?: boolean, compact?: boolean }>(), {
  canMakePersonal: true,
  compact: false,
})
const model = defineModel<TaskAudience>({ required: true })

const { members } = useFamily()
const { userId } = useAuth()

const adding = ref(false)

const selectedIds = computed(() => (model.value.kind === 'people' ? model.value.ids : []))
const nameOf = (id: string) =>
  id === userId.value ? 'Você' : members.value.find((m) => m.user_id === id)?.display_name ?? 'Ex-membro'

const selected = computed(() =>
  selectedIds.value.map((id) => ({ id, name: nameOf(id), avatar: members.value.find((m) => m.user_id === id)?.display_name ?? '' })),
)
const available = computed(() =>
  members.value
    .filter((m) => !selectedIds.value.includes(m.user_id))
    .sort((a, b) => Number(b.user_id === userId.value) - Number(a.user_id === userId.value))
    .map((m) => ({ id: m.user_id, name: m.user_id === userId.value ? 'Você' : m.display_name, avatar: m.display_name })),
)

function choose(kind: 'me' | 'family') {
  adding.value = false
  model.value = { kind }
}

function add(id: string) {
  model.value = { kind: 'people', ids: [...selectedIds.value, id] }
  if (available.value.length === 0) adding.value = false
}

function remove(id: string) {
  const ids = selectedIds.value.filter((value) => value !== id)
  model.value = ids.length ? { kind: 'people', ids } : { kind: props.canMakePersonal ? 'me' : 'family' }
}

const chip = computed(() => (props.compact ? 'h-8 px-3 text-sm' : 'h-9 px-3.5 text-[15px]'))
const idle = 'border-line-strong text-ink-muted hover:border-ink-subtle hover:text-ink'
const active = 'border-accent bg-accent-soft text-accent'
</script>

<template>
  <fieldset :id="id">
    <legend :class="compact ? 'sr-only' : 'mb-1.5 block text-sm font-medium text-ink'">Para quem</legend>

    <div class="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        class="inline-flex items-center rounded-full border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        :class="[chip, model.kind === 'me' ? active : idle]"
        :aria-pressed="model.kind === 'me'"
        :disabled="!canMakePersonal"
        :title="canMakePersonal ? undefined : 'Só quem criou pode tornar pessoal'"
        @click="choose('me')"
      >
        Eu
      </button>
      <button
        type="button"
        class="inline-flex items-center rounded-full border font-medium transition-colors"
        :class="[chip, model.kind === 'family' ? active : idle]"
        :aria-pressed="model.kind === 'family'"
        @click="choose('family')"
      >
        Família toda
      </button>

      <span
        v-for="person in selected"
        :key="person.id"
        class="inline-flex items-center gap-1.5 rounded-full border pl-1 font-medium"
        :class="[compact ? 'h-8 text-sm' : 'h-9 text-[15px]', active]"
      >
        <UiAvatar :name="person.avatar" size="sm" class="bg-panel" />
        {{ person.name }}
        <button
          type="button"
          class="-ml-0.5 mr-0.5 inline-flex size-7 items-center justify-center rounded-full hover:bg-accent/10"
          :aria-label="`Remover ${person.name}`"
          @click="remove(person.id)"
        >
          <X class="size-3.5" aria-hidden="true" />
        </button>
      </span>

      <button
        v-if="available.length"
        type="button"
        class="inline-flex items-center gap-1 rounded-full border border-dashed font-medium transition-colors"
        :class="[chip, adding ? 'border-accent text-accent' : 'border-line-strong text-ink-muted hover:border-ink-subtle hover:text-ink']"
        :aria-expanded="adding"
        :aria-controls="`${id}-membros`"
        @click="adding = !adding"
      >
        <Plus class="size-4" aria-hidden="true" />
        Adicionar membro
      </button>
    </div>

    <div
      v-if="adding && available.length"
      :id="`${id}-membros`"
      role="group"
      aria-label="Escolher membro"
      class="mt-2 flex flex-wrap gap-1.5 rounded bg-surface p-2"
    >
      <button
        v-for="person in available"
        :key="person.id"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel pl-1 pr-3 font-medium text-ink transition-colors hover:border-accent"
        :class="compact ? 'h-8 text-sm' : 'h-9 text-[15px]'"
        @click="add(person.id)"
      >
        <UiAvatar :name="person.avatar" size="sm" />
        {{ person.name }}
      </button>
    </div>
  </fieldset>
</template>
