<script setup lang="ts">
import { CircleAlert, Eye, EyeOff } from 'lucide-vue-next'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Entrar' })

const { userId, signIn } = useAuth()

if (userId.value) {
  await navigateTo('/', { replace: true })
}

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const pending = ref(false)
const errorMessage = ref<string | null>(null)

function describeError(error: unknown) {
  const { code, status } = (error ?? {}) as { code?: string; status?: number }
  if (code === 'invalid_credentials') return 'E-mail ou senha incorretos.'
  if (code === 'email_not_confirmed') return 'Este e-mail ainda não foi confirmado no Supabase.'
  if (code === 'over_request_rate_limit' || status === 429) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'
  if (!status) return 'Sem conexão com o servidor. Verifique a internet e tente de novo.'
  return 'Não foi possível entrar agora. Tente de novo em instantes.'
}

async function handleSubmit() {
  if (pending.value) return
  errorMessage.value = null
  pending.value = true
  try {
    await signIn(email.value.trim(), password.value)
  } catch (error) {
    errorMessage.value = describeError(error)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div>
    <AppWordmark class="text-2xl" />

    <h1 class="mt-12 font-display text-3xl font-semibold tracking-[-0.02em] text-ink">Entrar</h1>
    <p class="mt-2 text-base text-ink-muted">Acesse suas tarefas, compromissos e lembretes.</p>

    <form class="mt-8 flex flex-col gap-5" novalidate @submit.prevent="handleSubmit">
      <UiTextField
        id="email"
        v-model="email"
        label="E-mail"
        type="email"
        inputmode="email"
        autocomplete="username"
        required
        :invalid="!!errorMessage"
        :describedby="errorMessage ? 'login-erro' : undefined"
      />

      <UiTextField
        id="password"
        v-model="password"
        label="Senha"
        :type="showPassword ? 'text' : 'password'"
        autocomplete="current-password"
        required
        :invalid="!!errorMessage"
        :describedby="errorMessage ? 'login-erro' : undefined"
      >
        <template #trailing>
          <button
            type="button"
            class="inline-flex size-10 items-center justify-center rounded text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
            :aria-pressed="showPassword"
            @click="showPassword = !showPassword"
          >
            <EyeOff v-if="showPassword" class="size-5" aria-hidden="true" />
            <Eye v-else class="size-5" aria-hidden="true" />
          </button>
        </template>
      </UiTextField>

      <p
        v-if="errorMessage"
        id="login-erro"
        role="alert"
        class="flex items-start gap-2.5 rounded bg-danger-soft px-3.5 py-3 text-[15px] leading-snug text-danger"
      >
        <CircleAlert class="mt-px size-5 shrink-0" aria-hidden="true" />
        {{ errorMessage }}
      </p>

      <UiButton type="submit" class="mt-1 w-full" :loading="pending" :disabled="!email.trim() || !password">
        {{ pending ? 'Entrando…' : 'Entrar' }}
      </UiButton>
    </form>
  </div>
</template>
