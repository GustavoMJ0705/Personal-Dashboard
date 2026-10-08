# Misumoto — site pessoal de organização

Site de uso próprio para organizar tarefas, horários, compromissos e lembretes.
Single-user: sem times, permissões, convites ou onboarding. O login existe só para
proteger o acesso. Uso diário em desktop e celular.

## Stack (não trocar nem adicionar biblioteca sem perguntar)

- Nuxt **3** (3.21.x, não Nuxt 4) + Vue 3, Composition API, `<script setup>`, TypeScript strict
- Tailwind via `@nuxtjs/tailwindcss`
- Supabase (Postgres + Auth + Realtime) via `@nuxtjs/supabase` **2.x**
- Ícones: `lucide-vue-next` (único conjunto do projeto)
- Lembretes: `pg_cron` + Edge Function no Supabase
- Deploy: Vercel, `nitro.preset = 'vercel'`
- Dev: `supabase` (CLI) como devDependency, `vue-tsc`, `typescript@^5` (o npm instala a 7 por padrão; fixar ^5 para o vue-tsc)

Preferir solução nativa do Nuxt ou do Supabase a dependência externa. Datas:
usar `Intl.DateTimeFormat` com `timeZone: 'America/Sao_Paulo'`, sem lib de datas.

## Detalhes do `@nuxtjs/supabase` 2.x

- Lê `SUPABASE_URL` e `SUPABASE_KEY` do ambiente e expõe em `runtimeConfig.public.supabase`.
- `useSupabaseUser()` retorna os **claims do JWT**, não o objeto `User`: o id do usuário é `user.value?.sub`.
- `useSupabaseClient<Database>()` para ter os tipos gerados.
- Config usada:
  ```ts
  supabase: {
    redirectOptions: { login: '/login', callback: '/login', exclude: [], saveRedirectToCookie: true },
  }
  ```
  Não há OAuth nem magic link, então o callback aponta para `/login`. Depois do login,
  redirecionar para `useSupabaseCookieRedirect().pluck() ?? '/'`.
- Rotas protegidas pelo middleware global do módulo. Nada de checagem manual por página.

## Regras do Supabase

- Conta criada direto no supabase.com, não pelo Marketplace da Vercel. Chaves como env vars na Vercel.
- `service_role` / secret key **nunca** em código de cliente. Só em server routes ou Edge Functions.
- **RLS ligado em toda tabela, sem exceção.** Toda tabela tem `user_id uuid not null default auth.uid() references auth.users on delete cascade`
  e quatro policies (select/insert/update/delete) `to authenticated` comparando `(select auth.uid()) = user_id`. Tabela sem RLS é bug.
- Schema só por migration versionada em `supabase/migrations/`, nunca pelo painel.
- Timestamps em `timestamptz` (UTC). Conversão para America/Sao_Paulo só na exibição.
- Tipos gerados pelo CLI, nunca escritos à mão: `npm run db:types`
  (`supabase gen types typescript --linked --schema public > types/database.types.ts`).
  Aliases legíveis (`Task`, `TaskPriority`...) ficam em `types/models.ts`, derivados do arquivo gerado.
- Cadastro aberto desligado: `enable_signup = false` em `supabase/config.toml` (local) e, em produção,
  desligar "Allow new users to sign up" no painel e criar o único usuário em Authentication → Users.
- Realtime só em `tasks` (concluir no celular reflete no desktop). Nas outras tabelas, só se houver motivo real.

## Modelo de dados

Todas as tabelas: `id uuid default gen_random_uuid()`, `user_id`, `created_at`, `updated_at`
(trigger `public.set_updated_at()`), RLS por `auth.uid()`.

- `tasks`: `title`, `description`, `due_date date` (dia civil, sem hora), `priority public.task_priority`
  (enum `low | normal | high`, default `normal`; enum para os tipos gerados virem como união), `completed_at timestamptz`
- `events`: `title`, `starts_at`, `ends_at` (check `ends_at >= starts_at`), `location`, `all_day boolean`
- `reminders`: `title`, `remind_at`, `channel text`, `sent_at`; índice parcial em `remind_at where sent_at is null` para o pg_cron

A migration inicial está em `supabase/migrations/20261008190000_initial_schema.sql`, testada num Postgres:
RLS isola usuários, anon não lê nada e inserir com `user_id` de outro usuário é bloqueado.

## Escopo (não construir nada fora disso sem eu pedir)

1. Autenticação: login e logout, sem cadastro
2. Dashboard do dia: tarefas de hoje (com atrasadas) + próximos compromissos
3. Tarefas: criar, concluir, editar, excluir, adiar
4. Agenda: visão por dia e por semana
5. Lembretes com data e hora, disparados por `pg_cron`

**O canal dos lembretes ainda não foi decidido** (e-mail? push? outro?). Perguntar antes de implementar o item 5.

## Skills

Carregar `frontend-design` e `ui-ux-pro-max` **antes** de escrever qualquer componente ou tela.

## Direção visual

Base branca, azul como cor de ação. Limpa e moderna, espaçamento generoso, bordas sutis,
sombras discretas ou nenhuma. Sem gradiente chamativo, glassmorphism, emoji como ícone
ou decoração sem função. Dark mode fora do v1, mas os tokens já preparados para ele.

### Tokens (definidos uma vez; nunca hardcodar cor em componente)

Cores como variáveis CSS (triplas RGB) em `assets/css/main.css`, mapeadas no `tailwind.config.ts` com
`rgb(var(--color-x) / <alpha-value>)`. O `theme.colors` **substitui** a paleta padrão do Tailwind, então
só os tokens existem. Dark mode depois = redefinir as variáveis num seletor de tema.

| Token | Hex | Uso |
|---|---|---|
| canvas | #FFFFFF | fundo |
| surface / surface-strong | #F6F7F9 / #ECEEF2 | superfícies, hover |
| ink / ink-muted / ink-subtle | #15181E / #585F6D / #808794 | texto principal, secundário, placeholder |
| line / line-strong | #E3E6EB / #C8CDD5 | divisores, bordas de input |
| accent / accent-hover / accent-soft | #2347D6 / #1B38B3 / #ECF0FD | ação, links, ativo, progresso |
| success, warning, danger (+ `-soft`) | #168054, #A05E00, #BE2E29 | só para estado real |

- Tipografia: **Instrument Sans** (interface) e **Bricolage Grotesque** (só display: relógio e títulos de página), via Google Fonts no `app.head`.
- Raios: `sm` 6px (chips), padrão 10px (inputs, botões), `lg` 16px (painéis).
- Foco visível global: `:focus-visible` com `ring-2 ring-accent ring-offset-2`.
- Wordmark: "Misumoto" em Bricolage com um ponto final na cor accent.

### Layout

- Mobile: barra de abas fixa embaixo (respeitar `env(safe-area-inset-bottom)`). Desktop (md+): trilho lateral fixo à esquerda com wordmark, navegação e "Sair".
- Conteúdo em coluna única, `max-w` ~44rem, alinhado à esquerda.
- Só mostrar na navegação as telas que já existem.
- **Dashboard (a peça marcante, o resto fica quieto):** a hora atual grande em Bricolage, com numerais tabulares,
  a data por extenso ("quinta-feira, 8 de outubro") e uma frase que responde "o que fazer agora"
  (ex.: "3 tarefas para hoje. Próximo compromisso às 17:00: Dentista."). Abaixo: tarefas de hoje e atrasadas
  com criação rápida inline, e depois os próximos compromissos.
- Tarefas como linhas de lista com divisores, não um grid de cards.
- Evitar: labels em CAIXA ALTA, eyebrow acima de título, "→" em botão, metadados separados por "·".

## Princípios de UX

- Mobile-first; tudo funciona em 375px.
- A tela inicial responde "o que preciso fazer agora" sem clique.
- Criar, concluir e adiar tarefa em no máximo dois toques. "Adiar" = para o dia seguinte ao vencimento (ou a amanhã, se já venceu).
- Updates otimistas com rollback e toast de erro se o Supabase falhar. No create otimista, usar id temporário e trocar pela linha real; deduplicar por id, porque o eco do Realtime pode chegar antes da resposta.
- Ao voltar o app para primeiro plano (`visibilitychange`), recarregar as tarefas em silêncio: o canal do Realtime cai em segundo plano no celular.
- Relógio: estado inicial vindo do servidor (`useState`) para não quebrar a hidratação, atualizando a cada virada de minuto no cliente.
- Estados vazio, carregando e erro sempre tratados. Nunca tela em branco.
- Nada de modal para fluxo que cabe inline (editar tarefa = expandir a linha; excluir = confirmação inline).
- Acessibilidade: contraste, foco visível, label em todo input, navegação por teclado, `prefers-reduced-motion`. Inputs com fonte ≥ 16px (evita zoom no iOS).

## Padrões de código

- Componentes pequenos e de responsabilidade única. Pastas `components/app`, `ui`, `tasks`, `dashboard`...
- Estado e acesso a dados em composables (`useTasks`, `useUpcomingEvents`, `useAuth`, `useToast`, `useNow`).
  **Nenhum componente chama o Supabase direto.**
- Estado compartilhado com `useState` por chave. Limpar com `clearNuxtState` no logout.
- Código em inglês; textos da interface em português do Brasil.
- Datas `dd/MM/yyyy`, hora 24h, fuso America/Sao_Paulo. Helpers em `utils/datetime.ts`.
- Sem comentários óbvios.

## Como trabalhar comigo

- Direto e prático. Entregar o código, não a explicação dele.
- Não presumir requisitos não declarados. Se faltar algo relevante, perguntar uma vez, de forma objetiva.
- Bug/correção: trabalhar só com comportamento observado e confirmado, sem hipóteses de causa sem evidência.
- Alterações pontuais: editar só o necessário, sem reescrever o arquivo inteiro.
- Tela nova: descrever a hierarquia em uma frase e partir para a implementação.
- Ao terminar cada fase: `npm run typecheck` e `npm run build` passando, e conferir a tela em 375px e no desktop.
