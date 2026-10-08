<script setup lang="ts">
import { CircleAlert, Smile, UserPlus, Users } from 'lucide-vue-next'
import { eventEndMs } from '~/utils/agenda'
import { belongsTo } from '~/utils/family'

useHead({ title: 'Família' })

const { userId } = useAuth()
const { family, members, status, me, isOwner, others, load, ensureLoaded, subscribe } = useFamily()
const { events, ensureLoaded: ensureEvents } = useDayEvents()

await Promise.all([ensureLoaded(), ensureEvents()])
onMounted(subscribe)

const now = useNow()

function nextEventFor(memberId: string) {
  const today = toCivilDate(now.value)
  return events.value.find((event) =>
    belongsTo(event, memberId, userId.value)
    && eventEndMs(event) >= now.value.getTime()
    && toCivilDate(new Date(event.starts_at)) <= today,
  ) ?? null
}
</script>

<template>
  <div>
    <h1 class="font-display text-3xl font-semibold tracking-[-0.02em] text-ink md:text-4xl">Família</h1>
    <p v-if="family" class="mt-1 text-lg text-ink-muted">{{ family.name }}</p>

    <div v-if="status === 'loading' || status === 'idle'" aria-label="Carregando família" class="mt-8 flex flex-col gap-4">
      <div class="h-40 animate-pulse rounded-lg bg-surface" />
      <div v-for="n in 2" :key="n" class="flex items-center gap-3.5">
        <span class="size-10 animate-pulse rounded-full bg-surface-strong" />
        <span class="h-4 w-40 animate-pulse rounded-sm bg-surface-strong" />
      </div>
    </div>

    <div v-else-if="status === 'error'" role="alert" class="mt-8 flex flex-col items-start gap-4 rounded-lg bg-danger-soft p-5">
      <p class="flex items-start gap-2.5 text-base text-danger">
        <CircleAlert class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        Não foi possível carregar a família. Verifique a conexão e tente de novo.
      </p>
      <UiButton variant="secondary" size="sm" @click="load()">Tentar de novo</UiButton>
    </div>

    <section v-else-if="!family || !me" class="panel mt-8" aria-labelledby="criar-familia">
      <UiSectionTitle id="criar-familia" title="Criar família" :icon="Users" />
      <p class="mt-4 max-w-[34rem] text-base leading-relaxed text-ink-muted">
        Você ainda não faz parte de uma família. Crie uma para compartilhar tarefas e compromissos,
        ou peça para quem já tem uma te adicionar.
      </p>
      <FamilyCreateForm class="mt-6" />
    </section>

    <div v-else class="mt-8 flex flex-col gap-5 md:gap-6">
      <section aria-labelledby="meu-status" class="panel">
        <UiSectionTitle id="meu-status" title="Seu status" :icon="Smile" />
        <FamilyMyStatus class="mt-5" :member="me" :now="now" />
      </section>

      <section aria-labelledby="membros" class="panel">
        <UiSectionTitle id="membros" title="Membros" :icon="Users" :count="members.length" />
        <p v-if="others.length === 0" class="mt-3 text-base text-ink-muted">
          Só você por enquanto.{{ isOwner ? ' Adicione alguém logo abaixo.' : '' }}
        </p>
        <ul v-else class="mt-2 divide-y divide-line border-y">
          <FamilyMemberRow
            v-for="member in others"
            :key="member.id"
            :member="member"
            :now="now"
            :is-owner-row="member.role === 'owner'"
            :next-event="nextEventFor(member.user_id)"
            :can-remove="isOwner"
          />
        </ul>
      </section>

      <section v-if="isOwner" aria-labelledby="adicionar-membro" class="panel">
        <UiSectionTitle id="adicionar-membro" title="Adicionar membro" :icon="UserPlus" />
        <FamilyAddMember class="mt-4" />
      </section>
    </div>
  </div>
</template>
