<script setup lang="ts">
import { Pencil } from 'lucide-vue-next'
import type { FamilyMember } from '~/types/models'

const props = defineProps<{ member: FamilyMember, now: Date }>()

const { setMyStatus, setMyNote, renameMe } = useFamily()

const note = ref(props.member.status_note ?? '')
const editingName = ref(false)
const name = ref(props.member.display_name)
const nameInput = ref<HTMLInputElement>()

watch(() => props.member.status_note, (next) => {
  note.value = next ?? ''
})

const noteChanged = computed(() => note.value.trim() !== (props.member.status_note ?? ''))

function startRename() {
  name.value = props.member.display_name
  editingName.value = true
  nextTick(() => nameInput.value?.focus())
}

async function saveName() {
  if (!name.value.trim()) return
  editingName.value = false
  await renameMe(name.value)
}

function saveNote() {
  if (noteChanged.value) void setMyNote(note.value)
}
</script>

<template>
  <div class="rounded-lg border p-4 md:p-5">
    <div class="flex items-start gap-3.5">
      <UiAvatar :name="member.display_name" size="lg" />
      <div class="min-w-0 flex-1">
        <form v-if="editingName" class="flex flex-wrap items-center gap-2" @submit.prevent="saveName" @keydown.esc.prevent="editingName = false">
          <label for="meu-nome" class="sr-only">Seu nome</label>
          <input
            id="meu-nome"
            ref="nameInput"
            v-model="name"
            maxlength="60"
            autocomplete="given-name"
            class="h-10 min-w-0 flex-1 rounded border border-line-strong bg-canvas px-3 text-base text-ink focus:border-accent"
          >
          <UiButton variant="ghost" size="sm" @click="editingName = false">Cancelar</UiButton>
          <UiButton type="submit" size="sm" :disabled="!name.trim()">Salvar</UiButton>
        </form>
        <div v-else class="flex items-center gap-1">
          <p class="truncate text-lg font-semibold text-ink">{{ member.display_name }}</p>
          <button
            type="button"
            class="inline-flex size-9 shrink-0 items-center justify-center rounded text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            aria-label="Editar seu nome"
            @click="startRename"
          >
            <Pencil class="size-4" aria-hidden="true" />
          </button>
        </div>
        <FamilyStatusLine :member="member" :now="now" class="mt-0.5" />
      </div>
    </div>

    <FamilyStatusPicker class="mt-5" label="Seu status" :current="member.status" @select="setMyStatus($event)" />

    <form class="mt-3 flex items-end gap-2" @submit.prevent="saveNote">
      <div class="min-w-0 flex-1">
        <label for="minha-nota" class="sr-only">Nota do status</label>
        <input
          id="minha-nota"
          v-model="note"
          maxlength="80"
          autocomplete="off"
          enterkeyhint="done"
          placeholder="Nota opcional, como &quot;volto às 18h&quot;"
          class="h-11 w-full rounded border border-line-strong bg-canvas px-3.5 text-base text-ink placeholder:text-ink-subtle hover:border-ink-subtle focus:border-accent"
        >
      </div>
      <UiButton v-if="noteChanged" type="submit" size="sm" variant="secondary" class="h-11">Salvar nota</UiButton>
    </form>
  </div>
</template>
