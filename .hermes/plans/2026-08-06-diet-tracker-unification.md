# Unificação do Diet Tracker

## Objetivo

Unificar o comportamento do rastreador de dieta em uma única skill canônica (`diet-tracker`), usar o repositório `diet-tracker-dashboard` como fonte geral de conhecimento e manter uma Wiki operacional sobre frontend, backend, banco e fluxo conversacional.

## Princípios aceitos

- Mínimo de atrito, perguntando apenas quando a resposta melhorar materialmente a precisão.
- Entradas claras podem ser lançadas diretamente.
- Fotos, porções inferidas e ambiguidades geram prévia antes da gravação.
- Refeições compostas são persistidas item a item.
- `senderName` sugere identidade; autodeclaração livre prevalece.
- Confirmações pendentes podem ser dadas por qualquer participante, sem transferir a autoria do registro.
- Datas relativas usam o horário atual de Brasília (UTC−3).
- Premissas usadas para reduzir atrito devem ser explicitadas.
- Resposta pós-lançamento tem formato único e mobile-first.
- Sugestões só aparecem quando solicitadas, começando por preferências do usuário.

## Plano em 10 passos

1. Inspecionar o repositório, o adapter Python, as migrations, as skills e o estado do Git. **Concluído quando:** os pontos de entrada, schemas e conflitos estiverem catalogados.
2. Definir a arquitetura da skill única e a Wiki. **Concluído quando:** existir este plano e a estrutura documental estiver clara.
3. Reescrever a skill `diet-tracker` como política canônica curta. **Concluído quando:** regras conversacionais e boundary do adapter estiverem em um único arquivo.
4. Criar a Wiki do repositório. **Concluído quando:** frontend, backend, chat, banco e operação estiverem documentados com links internos.
5. Corrigir o fluxo de persistência do chat. **Concluído quando:** refeições compostas gerarem registros item a item, confirmações forem idempotentes e respostas puderem carregar resumo.
6. Atualizar testes para o contrato unificado. **Concluído quando:** houver regressões para itemização, confirmação, premissas, datas e resumo padronizado.
7. Remover skills e referências redundantes ou contraditórias. **Concluído quando:** `diet-tracker` for a única skill de operação do grupo e não houver policy concorrente ativa.
8. Executar testes, validação de frontmatter, checagem de links e build. **Concluído quando:** resultados reais estiverem registrados.
9. Fazer revisão independente do diff. **Concluído quando:** não houver erro lógico ou escopo acidental não resolvido.
10. Commitar o escopo isolado e reportar arquivos, validações e pendências. **Concluído quando:** o commit contiver somente a unificação.

## Fora de escopo nesta rodada

- Alterar metas nutricionais ou dados de produção sem pedido específico.
- Fazer deploy ou migration live automaticamente.
- Transformar a Wiki em documentação gerada automaticamente.
