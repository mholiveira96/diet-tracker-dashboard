# Diet Tracker Wiki

Fonte geral de conhecimento do `diet-tracker-dashboard`. A skill conversacional deve consultar esta Wiki para detalhes de implementação, sem duplicar regras de produto.

## Mapa

- [Arquitetura](./architecture.md) — visão geral das camadas e limites.
- [Frontend](./frontend.md) — Next.js, telas, estado e APIs consumidas.
- [Backend](./backend.md) — rotas, repositories, chat e contratos.
- [Banco de dados](./database.md) — Turso/libSQL, tabelas, ownership, datas e migrations.
- [Comportamento conversacional](./behavior.md) — contrato único para WhatsApp/PWA.

## Fonte de verdade

- Persistência: Turso/libSQL configurado por `TURSO_URL` e `TURSO_AUTH_TOKEN`.
- Operação WhatsApp: adapter Python em `~/.hermes/skills/openclaw-imports/diet-tracker/scripts/tracker.py`.
- Dashboard/PWA: este repositório, Next.js 14 App Router.
- Data operacional: dia em Brasília, UTC−3; timestamps persistidos devem ser tratados com essa conversão explicitamente.

## Regra de manutenção

Ao alterar schema, API, parser ou fluxo de confirmação, atualizar a página correspondente da Wiki e os testes do módulo. Não criar uma nova skill para uma variação do comportamento: altere a skill canônica `diet-tracker`.
