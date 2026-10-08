<script setup lang="ts">
import { CircleAlert } from 'lucide-vue-next'

const { createFamily } = useFamily()

const name = ref('')
const displayName = ref('')
const pending = ref(false)
const error = ref<string | null>(null)

async function submit() {
  if (!name.value.trim() || !displayName.value.trim()) {
    error.value = 'Preencha o nome da família e o seu nome.'
    return
  }
  pending.value = true
  error.value = await createFamily(name.value, displayName.value)
  pending.value = false
}
</script>

<template>
  <form class="flex flex-col gap-4 rounded-lg bg-surface p-4 md:p-5" novalidate @submit.prevent="submit">
    <UiTextField id="familia-nome" v-model="name" label="Nome da família" autocomplete="off" required />
    <UiTextField id="familia-meu-nome" v-model="displayName" label="Seu nome, como a família vai te ver" autocomplete="given-name" required />
    <p v-if="error" role="alert" class="flex items-start gap-2 text-[15px] text-danger">
      <CircleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {{ error }}
    </p>
    <UiButton type="submit" class="self-start" :loading="pending">Criar família</UiButton>
  </form>
</template>
