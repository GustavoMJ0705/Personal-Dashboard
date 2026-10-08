<script setup lang="ts">
import { CircleAlert, Eye, EyeOff, MailCheck } from 'lucide-vue-next'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Criar conta' })

const MIN_PASSWORD = 6

const { userId, signUp } = useAuth()

if (userId.value) {
  await navigateTo('/', { replace: true })
}

const name = ref('')
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const pending = ref(false)
const errorMessage = ref<string | null>(null)
const sentTo = ref<string | null>(null)

const canSubmit = computed(() => name.value.trim() && email.value.trim() && password.value.length >= MIN_PASSWORD)

function describeError(error: unknown) {
  const { code, status } = (error ?? {}) as { code?: string, status?: number }
  if (code === 'user_already_exists' || code === 'email_exists') return 'Já existe uma conta com esse e-mail. Entre com ela.'
  if (code === 'weak_password') return 'Essa senha é fraca. Use uma mais longa, misturando letras e números.'
  if (code === 'email_address_invalid' || code === 'validation_failed') return 'Esse e-mail não parece válido. Confira e tente de novo.'
  if (code === 'signup_disabled') return 'O cadastro está desligado no Supabase. Ligue em Authentication, Sign In / Providers.'
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || status === 429) {
    return 'Muitos cadastros seguidos. Espere alguns minutos e tente de novo.'
  }
  if (!status) return 'Sem conexão com o servidor. Verifique a internet e tente de novo.'
  return 'Não foi possível criar a conta agora. Tente de novo em instantes.'
}

async function handleSubmit() {
  if (pending.value || !canSubmit.value) return
  errorMessage.value = null
  pending.value = true
  try {
    const { needsConfirmation } = await signUp(name.value.trim(), email.value.trim(), password.value)
    if (needsConfirmation) sentTo.value = email.value.trim()
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

    <template v-if="sentTo">
      <h1 class="mt-12 font-display text-3xl font-semibold tracking-[-0.02em] text-ink">Confirme seu e-mail</h1>
      <p class="mt-4 flex items-start gap-3 rounded-lg bg-accent-soft p-4 text-base leading-relaxed text-ink">
        <MailCheck class="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
        <span>Enviamos um link para <strong class="font-semibold">{{ sentTo }}</strong>. Abra o e-mail e toque no link para ativar a conta.</span>
      </p>
      <p class="mt-4 text-[15px] text-ink-muted">Não chegou? Veja a caixa de spam ou espere alguns minutos.</p>
      <NuxtLink to="/login" class="mt-8 inline-flex rounded-sm text-[15px] font-medium text-accent hover:text-accent-hover">Ir para o login</NuxtLink>
    </template>

    <template v-else>
      <h1 class="mt-12 font-display text-3xl font-semibold tracking-[-0.02em] text-ink">Criar conta</h1>
      <p class="mt-2 text-base text-ink-muted">Organize suas tarefas e compromissos e participe da agenda da família.</p>

      <form class="mt-8 flex flex-col gap-5" novalidate @submit.prevent="handleSubmit">
        <UiTextField id="nome" v-model="name" label="Seu nome" autocomplete="given-name" required />

        <UiTextField
          id="email"
          v-model="email"
          label="E-mail"
          type="email"
          inputmode="email"
          autocomplete="email"
          required
        />

        <div>
          <UiTextField
            id="password"
            v-model="password"
            label="Senha"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            required
            describedby="senha-dica"
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
          <p id="senha-dica" class="mt-1.5 text-sm text-ink-muted">Pelo menos {{ MIN_PASSWORD }} caracteres.</p>
        </div>

        <p
          v-if="errorMessage"
          role="alert"
          class="flex items-start gap-2.5 rounded bg-danger-soft px-3.5 py-3 text-[15px] leading-snug text-danger"
        >
          <CircleAlert class="mt-px size-5 shrink-0" aria-hidden="true" />
          {{ errorMessage }}
        </p>

        <UiButton type="submit" class="mt-1 w-full" :loading="pending" :disabled="!canSubmit">
          {{ pending ? 'Criando conta…' : 'Criar conta' }}
        </UiButton>
      </form>

      <p class="mt-8 text-[15px] text-ink-muted">
        Já tem conta?
        <NuxtLink to="/login" class="rounded-sm font-medium text-accent hover:text-accent-hover">Entrar</NuxtLink>
      </p>
    </template>
  </div>
</template>
