<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const notFound = computed(() => props.error.statusCode === 404)

useHead({ title: notFound.value ? 'Página não encontrada' : 'Erro' })
</script>

<template>
  <main class="flex min-h-dvh flex-col px-5 pb-12 pt-[max(4rem,14vh)]">
    <div class="mx-auto w-full max-w-sm">
      <AppWordmark class="text-2xl" />
      <h1 class="mt-10 font-display text-3xl font-semibold tracking-[-0.02em] text-ink">
        {{ notFound ? 'Página não encontrada' : 'Algo deu errado' }}
      </h1>
      <p class="mt-3 text-base leading-relaxed text-ink-muted">
        {{ notFound ? 'O endereço não existe ou foi alterado.' : 'Recarregue a página. Se continuar, tente de novo em alguns minutos.' }}
      </p>
      <UiButton class="mt-8" @click="clearError({ redirect: '/' })">Voltar para hoje</UiButton>
    </div>
  </main>
</template>
