# Backend

## Rotas principais

- `GET /api/profiles` — perfis, overview, leaderboard e aderência.
- `GET /api/data` — dashboard de um perfil e uma data.
- `GET/PUT /api/goals` — metas por perfil.
- `PUT/DELETE /api/meals/:id` — edição e soft delete profile-scoped.
- `PUT/DELETE /api/workouts/:id` — edição e soft delete profile-scoped.
- `GET /api/audit` — histórico de mudanças.
- `POST /api/audit/:id/restore` — restauração auditada.
- `GET /api/chat/thread` e `POST /api/chat/messages` — chat persistente.
- `POST /api/chat/messages/:id/confirm` — gravação idempotente de drafts.
- `/api/chat/upload` — anexos de imagem.

## Repositories

- `lib/repositories/dashboard.js` — summaries, histórico, overview e compatibilidade de colunas de workouts.
- `lib/repositories/meals.js` — leitura, edição, soft delete e restore.
- `lib/repositories/workouts.js` — mesma responsabilidade para treinos e exercícios.
- `lib/repositories/goals.js` — metas atuais por perfil.
- `lib/repositories/audit.js` — eventos append-only.
- `lib/repositories/profiles.js` — perfis e onboarding.

## Chat

- `lib/food-ai/normalize.js` — normalização e decisão auto-save/draft/clarify.
- `lib/chat/ingest.js` — persiste mensagem, parse, draft e records.
- `lib/chat/confirm.js` — plano idempotente de confirmação.
- `lib/chat/persist.js` — SQL de meals/workouts.
- `lib/chat/store.js` — threads, mensagens, anexos e links.

O parser pode propor `log_meal`, `log_workout`, `clarify` ou `noop`. Estimativas e imagens devem seguir o caminho de draft/confirm, nunca gravar silenciosamente.

## SQL e libSQL

Sempre usar `execute({ sql, args })` via `lib/db.js`. Queries devem ser parametrizadas. Repositories devem aplicar `profile_id` e `deleted_at IS NULL` nos reads normais.
