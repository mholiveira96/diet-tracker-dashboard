# Banco de dados

## Conexão

O banco de produção é Turso/libSQL. A aplicação usa `@libsql/client/web`; o adapter Python usa a mesma fonte remota por suas variáveis de ambiente. Não usar cópia SQLite local para verificar dados de produção.

## Tabelas de domínio

### `profiles`

`id`, `slug`, `display_name`, `whatsapp_lid`, `status`, dados de onboarding (`age`, `sex`, `height_cm`, `weight_kg`, `activity_level`, `goal_type`, `goal_pace`), `onboarding_step`, `onboarding_json`, timestamps.

### `meals`

`id`, `description`, `amount`, `unit`, `calories`, `protein`, `carbs`, `fat`, `logged_at`, `profile_id`, `deleted_at`.

Uma refeição composta deve gerar várias linhas, uma por item, para permitir correções isoladas.

### `workouts`

`id`, `modality`, `duration_min`, `calories`, `logged_at`, `profile_id`, `deleted_at` e, quando presentes, `workout_type`, `intensity`, `notes`.

`workout_exercises` referencia `workouts` por `workout_id`; não duplica `profile_id`.

### `goals`

Histórico de metas com `calories`, `protein`, `carbs`, `fat`, `profile_id` e `updated_at`. O resumo usa a linha mais recente do perfil.

### `profile_favorites`

Favoritos nutricionais por perfil: nome, macros, porção-base e unidade. A tabela legada `favorites` existe para compatibilidade/migração; novas consultas profile-aware devem preferir `profile_favorites`.

### Chat e auditoria

- `chat_threads` pertence a um perfil.
- `chat_messages` pertence a uma thread.
- `chat_attachments` guarda imagens e retenção.
- `parse_runs` guarda o resultado/metadata do parser.
- `message_record_links` liga mensagens aos registros criados.
- `audit_events` guarda before/after e restaurações.

## Migrations

- `001_add_workout_details.sql` — exercícios e campos detalhados de treino.
- `002_add_chat_ingestion.sql` — chat, anexos e parse runs.
- `003_add_profiles_and_audit.sql` — perfis, ownership, soft delete, favoritos por perfil e auditoria.

Antes de assumir que uma coluna opcional existe em produção, consultar `PRAGMA table_info(workouts)`. O repository já usa fallback `NULL` para `workout_type`, `intensity` e `notes` ausentes.

## Datas

O dia operacional é Brasília (UTC−3). O padrão de filtro é `date(logged_at, '-3 hours')`. Timestamps históricos devem ser enviados explicitamente; não confiar em `date('now')` quando o usuário forneceu uma data.

## Segurança operacional

- Toda query pessoal recebe `profile_id`.
- IDs de meals/workouts nunca bastam para editar/excluir.
- Soft delete preserva recuperação.
- Auditoria é append-only.
- Migrations devem ser aditivas e testadas fora de produção antes de aplicar no Turso.
