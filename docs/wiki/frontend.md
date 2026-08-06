# Frontend

## Stack

- Next.js 14 App Router
- React 18 + TypeScript
- Tailwind CSS
- Recharts para analytics
- PWA/service worker em `public/sw.js`

## Entrada principal

`app/page.tsx` controla:

- perfil ativo e persistência no `localStorage`;
- data selecionada em BRT;
- abas de grupo, desempenho e perfil;
- carregamento de overview, analytics, goals, auditoria e preferências;
- edição, exclusão e restauração de itens.

## Componentes

- `app/_components/group-overview.tsx` — visão agregada dos perfis.
- `app/_components/analytics-screen.tsx` — consumo, treinos, histórico e timeline.
- `app/_components/profile-screen.tsx` — metas e preferências.
- `app/_components/chat-screen.tsx` — superfície de chat/API; atualmente não está montado em `app/page.tsx`, então deve ser tratado como componente pronto para API até ser adicionado ao shell.
- `app/_components/audit-panel.tsx` — alterações e restauração.
- `app/_components/edit-item-modal.tsx` — edição de refeições/treinos.

## Contrato de leitura

- `/api/profiles?date=YYYY-MM-DD` para perfis e visão do grupo.
- `/api/data?profileId=<id>&date=YYYY-MM-DD` para uma pessoa.
- `/api/audit?profileId=<id>` para eventos.
- `/api/chat/thread?profileId=<id>` para a conversa do perfil.

O frontend não deve assumir metas estáticas como fonte final. Use sempre `goals` retornado pelo backend.

## Edição

Toda edição envia `profileId` explicitamente e o backend verifica que o item pertence ao perfil. Após mutações, recarregar analytics, overview e auditoria. Não usar ID sozinho para alterar ou excluir.
