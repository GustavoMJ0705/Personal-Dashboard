<script setup lang="ts">
import { CircleAlert } from 'lucide-vue-next'

const { addMember } = useFamily()

const email = ref('')
const displayName = ref('')
const pending = ref(false)
const error = ref<string | null>(null)

async function submit() {
  if (!email.value.trim() || !displayName.value.trim()) {
    error.value = 'Preencha o e-mail e o nome.'
    return
  }
  pending.value = true
  error.value = await addMember(email.value, displayName.value)
  pending.value = false
  if (!error.value) {
    email.value = ''
    displayName.value = ''
  }
}
</script>

<template>
  <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
    <p class="text-[15px] leading-relaxed text-ink-muted">
      A pessoa precisa ter uma conta. Crie no painel do Supabase, em Authentication, Users, e use o mesmo e-mail aqui.
    </p>
    <div class="grid gap-4 sm:grid-cols-2">
      <UiTextField
        id="membro-email"
        v-model="email"
        label="E-mail"
        type="email"
        inputmode="email"
        autocomplete="off"
        required
        :invalid="!!error"
        :describedby="error ? 'membro-erro' : undefined"
      />
      <UiTextField id="membro-nome" v-model="displayName" label="Nome" autocomplete="off" required />
    </div>
    <p v-if="error" id="membro-erro" role="alert" class="flex items-start gap-2 text-[15px] text-danger">
      <CircleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {{ error }}
    </p>
    <UiButton type="submit" variant="secondary" class="self-start" :loading="pending">Adicionar à família</UiButton>
  </form>
</template>
