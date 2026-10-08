<script setup lang="ts">
import { CircleAlert, Eye, EyeOff } from 'lucide-vue-next'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Entrar' })

const { userId, signIn } = useAuth()

if (userId.value) {
  await navigateTo('/', { replace: true })
}

// Volta do link de confirmação de e-mail: o Supabase troca o código pela sessão no cliente.
watch(userId, (id) => {
  if (id) void navigateTo('/', { replace: true })
})

const linkError = ref<string | null>(null)
onMounted(() => {
  const query = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const code = query.get('error_code') ?? hash.get('error_code')
  if (!code) return
  linkError.value = code === 'otp_expired'
    ? 'O link de confirmação expirou. Entre com seu e-mail e senha; se não der, crie a conta de novo.'
    : 'Não foi possível confirmar o e-mail por esse link. Tente entrar com seu e-mail e senha.'
})

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const pending = ref(false)
const errorMessage = ref<string | null>(null)

function describeError(error: unknown) {
  const { code, status } = (error ?? {}) as { code?: string; status?: number }
  if (code === 'invalid_credentials') return 'E-mail ou senha incorretos.'
  if (code === 'email_not_confirmed') return 'Confirme seu e-mail antes de entrar: abra o link que enviamos no cadastro.'
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

    <p v-if="linkError && !errorMessage" role="alert" class="mt-6 flex items-start gap-2.5 rounded bg-warning-soft px-3.5 py-3 text-[15px] leading-snug text-warning">
      <CircleAlert class="mt-px size-5 shrink-0" aria-hidden="true" />
      {{ linkError }}
    </p>

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

    <p class="mt-8 text-[15px] text-ink-muted">
      Ainda não tem conta?
      <NuxtLink to="/cadastro" class="rounded-sm font-medium text-accent hover:text-accent-hover">Criar conta</NuxtLink>
    </p>
  </div>
</template>
