# Misumoto — organização pessoal e da família

Site para organizar tarefas, horários, compromissos e lembretes, meus e da minha família.
Cada familiar tem login próprio. O cadastro é aberto pela tela `/cadastro` (nome, e-mail e senha;
o nome vai em `user_metadata.display_name`). Depois o dono adiciona a pessoa à família pelo e-mail.
Uso diário em desktop e celular.

- Um usuário pertence a no máximo uma família. A família tem um dono (owner), que adiciona e remove membros.
- Tarefas e compromissos podem ser **pessoais** (só quem criou vê), **atribuídos a um familiar** ou **da família toda**.
- Itens compartilhados: qualquer membro edita e conclui; só quem criou exclui ou deixa de compartilhar.
- Lembretes continuam pessoais.
- Cada membro tem um status manual (em casa, trabalhando, estudando, viajando, fora) com nota opcional.

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
- **RLS ligado em toda tabela, sem exceção.** Tabela sem RLS é bug. Toda tabela tem `user_id uuid references auth.users`
  (dono/criador da linha) e policies `to authenticated`:
  - dados pessoais: `(select auth.uid()) = user_id`;
  - dados compartilhados (`family_id` preenchido): `private.is_family_member(family_id)`.
- Funções auxiliares das policies ficam no schema `private` (fora da API), com `security definer`,
  `stable` e `set search_path = ''`, para evitar recursão de RLS entre `family_members` e as outras tabelas.
- Escritas que mexem em mais de uma tabela ou leem `auth.users` (criar família, adicionar membro) são RPCs
  `security definer` em `public`, com a checagem de permissão dentro da função. Por isso `families` e
  `family_members` não têm policy de insert.
- Colunas que o cliente não pode mudar (`user_id`, `family_id` de membro, `role`) ficam protegidas por grant
  de coluna: `revoke update` na tabela e `grant update (colunas permitidas)`.
- Schema só por migration versionada em `supabase/migrations/`, nunca pelo painel.
- Timestamps em `timestamptz` (UTC). Conversão para America/Sao_Paulo só na exibição.
- Tipos gerados pelo CLI, nunca escritos à mão: `npm run db:types`
  (`supabase gen types typescript --linked --schema public > types/database.types.ts`).
  Aliases legíveis (`Task`, `TaskPriority`...) ficam em `types/models.ts`, derivados do arquivo gerado.
- Cadastro aberto: `enable_signup = true` em `supabase/config.toml` (local) e "Allow new users to sign up" ligado no painel.
  A tela funciona com ou sem "Confirm email": sem sessão no retorno do `signUp`, mostra o aviso de confirmação;
  o link volta para `/login`, que troca o código pela sessão e segue para o início.
  Em produção, a URL da Vercel precisa estar em Authentication → URL Configuration (Site URL e Redirect URLs).
- Realtime em `tasks`, `events` e `family_members`: com família, outra pessoa pode mudar o que eu vejo.
  Os canais não filtram por `user_id`; o RLS já limita o que chega a cada um.
- Testes de RLS em `supabase/tests/*.sql`: rodam numa transação com `rollback`, simulando usuários via
  `request.jwt.claims`. Toda mudança de policy precisa de teste.

## Modelo de dados

Todas as tabelas: `id uuid default gen_random_uuid()`, `user_id`, `created_at`, `updated_at`
(trigger `public.set_updated_at()`), RLS por `auth.uid()`.

- `tasks`: `title`, `description`, `due_date date` (dia civil, sem hora), `priority public.task_priority`
  (enum `low | normal | high`, default `normal`; enum para os tipos gerados virem como união), `completed_at timestamptz`,
  `family_id`, `assignee_id`
- `events`: `title`, `starts_at`, `ends_at` (check `ends_at >= starts_at`), `location`, `all_day boolean`, `family_id`, `assignee_id`
- `reminders`: `title`, `remind_at`, `channel text`, `sent_at`; índice parcial em `remind_at where sent_at is null` para o pg_cron. Sempre pessoal.
- `families`: `user_id` (dono), `name`
- `family_members`: `family_id`, `user_id` (unique: uma família por usuário), `display_name`, `role` (`owner | member`),
  `status` (`at_home | working | studying | traveling | out`), `status_note`, `status_updated_at` (trigger)

Em `tasks` e `events`: `family_id` nulo = pessoal. `family_id` preenchido e `assignee_id` nulo = família toda.
`assignee_id` preenchido = atribuído àquele familiar (precisa ser membro da mesma família).

RPCs: `create_family(family_name, member_display_name)`, `add_family_member(member_email, member_display_name)` (só o dono).

Migrations em `supabase/migrations/`; testes de RLS em `supabase/tests/`.

## Escopo (não construir nada fora disso sem eu pedir)

1. Autenticação: cadastro, login e logout
2. Início: saudação, relógio, tarefas do dia (minhas, atribuídas a mim e da família toda), compromissos do dia e situação da família
3. Tarefas: criar, concluir, editar, excluir, adiar, com "Para quem"
4. Agenda: faixa de dias rolável + linha do tempo do dia (horizontal no desktop, vertical no celular), filtro por familiar
5. Família: criar família, meu status, membros, adicionar e remover membro (dono)
6. Lembretes com data e hora, disparados por `pg_cron`

**O canal dos lembretes ainda não foi decidido** (e-mail? push? outro?). Perguntar antes de implementar o item 6.

## Skills

Carregar `frontend-design` e `ui-ux-pro-max` **antes** de escrever qualquer componente ou tela.

## Direção visual

Dois temas, escolhidos no seletor (Claro, Escuro, Automático) e guardados no cookie `theme`,
aplicado como `data-theme` no `<html>` pelo servidor (sem piscar):
- **Claro:** base branca, azul como cor de ação.
- **Escuro:** preto com azul royal. O azul é secundário: ações principais e seleções em branco (`action`),
  azul em detalhes (ícones de seção, indicador da navegação, pontos, linha de agora, links).
Limpa e moderna, espaçamento generoso, bordas sutis, sombras discretas. Sem gradiente chamativo,
glassmorphism, emoji como ícone ou decoração sem função.

Elementos visuais (nos dois temas): fundo pontilhado de caderno sumindo para baixo, brilho azul discreto no topo,
seções em painéis (`.panel`, fundo `panel`) com título e ícone (`UiSectionTitle`), régua do dia no Início,
mini calendário no trilho lateral e estados vazios com ícone (`UiEmptyState`).

### Tokens (definidos uma vez; nunca hardcodar cor em componente)

Cores como variáveis CSS (triplas RGB) em `assets/css/main.css`, mapeadas no `tailwind.config.ts` com
`rgb(var(--color-x) / <alpha-value>)`. O `theme.colors` **substitui** a paleta padrão do Tailwind, então
só os tokens existem. O tema escuro só redefine as variáveis (`[data-theme='dark']` e, em `system`, via
`prefers-color-scheme`); componente nenhum tem classe `dark:`.

| Token | Hex | Uso |
|---|---|---|
| canvas | #FFFFFF | fundo |
| surface / surface-strong | #F6F7F9 / #ECEEF2 | superfícies, hover |
| ink / ink-muted / ink-subtle | #15181E / #585F6D / #808794 | texto principal, secundário, placeholder |
| line / line-strong | #E3E6EB / #C8CDD5 | divisores, bordas de input |
| accent / accent-hover / accent-soft | #2347D6 / #1B38B3 / #ECF0FD | links, ativo, detalhes (escuro: #5577E8 / #7892F0 / #0B1430) |
| action / action-hover / action-contrast | claro = accent; escuro #F1F2F4 / #D5D8DE / #000 | botão primário e item selecionado |
| panel | #FFFFFF (escuro #0B0C10) | painéis sobre o fundo pontilhado |
| success, warning, danger (+ `-soft`) | #168054, #A05E00, #BE2E29 | só para estado real |

- Tipografia: **Instrument Sans** (interface) e **Bricolage Grotesque** (só display: relógio e títulos de página), via Google Fonts no `app.head`.
- Raios: `sm` 6px (chips), padrão 10px (inputs, botões), `lg` 16px (painéis).
- Foco visível global: `:focus-visible` com `ring-2 ring-accent ring-offset-2`.
- Wordmark: "Misumoto" em Bricolage com um ponto final na cor accent.

### Layout

- Mobile: barra de abas fixa embaixo (respeitar `env(safe-area-inset-bottom)`). Desktop (md+): trilho lateral fixo à esquerda com wordmark, navegação e "Sair".
- Conteúdo em coluna única, `max-w` ~44rem, alinhado à esquerda.
- Só mostrar na navegação as telas que já existem.
- Navegação: Início, Agenda, Tarefas, Família.
- **Início (a peça marcante, o resto fica quieto):** saudação pelo horário com o meu nome ("Boa tarde, Gustavo"),
  a hora atual grande em Bricolage com numerais tabulares, a data por extenso e uma frase que responde
  "o que fazer agora". Abaixo: tarefas do dia, compromissos do dia (próximo em destaque) e situação da família.
- **Agenda:** faixa de dias rolável (scroll-snap) no topo; abaixo, a linha do tempo do dia. No desktop (md+) as horas
  correm na horizontal; no celular, na vertical (coluna rolável de 00h a 24h, sobreposições lado a lado).
  Linha de "agora" e blocos posicionados pelo horário nas duas. Dia inteiro numa faixa própria.
  Detalhes e edição inline abaixo da linha do tempo. Sem cor por pessoa: quem é o dono aparece pelo avatar de iniciais.
- Itens compartilhados mostram para quem são ("Para Ana", "Família"); pessoais não mostram nada.
- Tarefas como linhas de lista com divisores, não um grid de cards.
- Evitar: labels em CAIXA ALTA, eyebrow acima de título, "→" em botão, metadados separados por "·".

## Princípios de UX

- Mobile-first; tudo funciona em 375px.
- A tela inicial responde "o que preciso fazer agora" sem clique.
- Criar, concluir e adiar tarefa em no máximo dois toques. "Adiar" = para o dia seguinte ao vencimento (ou a amanhã, se já venceu).
- Updates otimistas com rollback e toast de erro se o Supabase falhar. No create otimista, usar id temporário e trocar pela linha real; deduplicar por id, porque o eco do Realtime pode chegar antes da resposta.
- Ao voltar o app para primeiro plano (`visibilitychange`), recarregar em silêncio (tarefas, agenda, família): o canal do Realtime cai em segundo plano no celular.
- Relógio: estado inicial vindo do servidor (`useState`) para não quebrar a hidratação, atualizando a cada virada de minuto no cliente.
- Estados vazio, carregando e erro sempre tratados. Nunca tela em branco.
- Nada de modal para fluxo que cabe inline (editar tarefa = expandir a linha; excluir = confirmação inline).
- Acessibilidade: contraste, foco visível, label em todo input, navegação por teclado, `prefers-reduced-motion`. Inputs com fonte ≥ 16px (evita zoom no iOS).

## Padrões de código

- Componentes pequenos e de responsabilidade única. Pastas `components/app`, `ui`, `tasks`, `dashboard`...
- Estado e acesso a dados em composables (`useTasks`, `useAgenda`, `useDayEvents`, `useFamily`, `useAuth`, `useToast`, `useNow`).
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
