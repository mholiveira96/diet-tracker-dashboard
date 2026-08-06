# Arquitetura

## Camadas

1. **Conversação** — Hermes interpreta texto, áudio transcrito, imagens, intenção, fontes nutricionais e confirmações.
2. **Adapter WhatsApp** — `tracker.py` valida actions, resolve o perfil confirmado, grava no Turso e retorna resumo.
3. **PWA/API** — Next.js expõe leitura, edição, exclusão, restauração, chat e preferências.
4. **Repositories** — `lib/repositories/` concentra SQL profile-scoped, auditoria e compatibilidade de schema.
5. **Turso/libSQL** — banco remoto; migrations em `migrations/` são a evolução declarativa.

## Boundary importante

Hermes não deve depender de heurísticas internas do Python para interpretar linguagem. O fluxo preferido é:

```text
mensagem/foto → interpretação Hermes → action JSON → adapter → Turso → resumo normalizado → resposta padrão
```

O chat do PWA tem a mesma separação, mas persiste mensagens, parse runs, pendências e links entre mensagens e registros.

## Perfis

Todos os registros pessoais precisam de `profile_id`. O frontend seleciona o perfil explicitamente. O adapter usa o perfil confirmado na conversa. Nenhum resumo deve ser agregado entre perfis, salvo nas telas de visão geral do grupo.

## Auditoria

Edições, exclusões e restaurações do dashboard geram eventos append-only em `audit_events`. Exclusão padrão é soft delete; restauração cria novo evento.
