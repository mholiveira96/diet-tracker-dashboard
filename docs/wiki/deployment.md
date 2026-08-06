# Deployment e arquitetura pública

## Domínio e fluxo de publicação

O Hunger Games é acessado publicamente em:

- `https://matheusinho.cloud/hungergames/`

`matheusinho.cloud` é a VPS. O frontend não é compilado diretamente pelo Caddy: o Caddy encaminha o caminho `/hungergames` para o projeto Vercel `dieta-matheusinho.vercel.app`.

Fluxo:

```text
GitHub origin/main
        ↓
Vercel: dieta-matheusinho.vercel.app
        ↓
VPS: Caddy em matheusinho.cloud
        ↓
/hungergames/
```

O deploy normal é feito com push para `origin/main`. A atualização pode levar alguns instantes para aparecer no alias público; a verificação deve ser feita no alias Vercel e depois no domínio da VPS.

## Regra crítica de caminhos

O Caddy publica o app sob o prefixo `/hungergames` e remove esse prefixo antes de encaminhar a requisição ao Vercel.

Portanto, assets públicos do app devem ser referenciados com o prefixo completo:

```text
/hungergames/icons/icon-192.png
/hungergames/manifest.webmanifest
/hungergames/chat-bg.svg
```

Não usar caminhos absolutos sem o prefixo, como `/icons/icon-192.png` ou `/chat-bg.svg`. Esses caminhos apontam para a raiz da VPS, não para o frontend publicado, e podem retornar resposta vazia ou conteúdo incorreto.

A exceção atual é o service worker registrado em `/sw.js`: o Caddy trata esse caminho como asset do Hunger Games. O registro usa escopo explícito:

```ts
navigator.serviceWorker.register('/sw.js', { scope: '/hungergames/' });
```

## Configuração do Caddy

A configuração relevante fica em `/etc/caddy/Caddyfile`:

- `/hungergames` redireciona para `/hungergames/`;
- assets especiais (`/_next`, `/api`, `/sw.js`, `/manifest.webmanifest`, `/icon.svg` etc.) são encaminhados ao Vercel;
- `handle_path /hungergames/*` remove o prefixo e encaminha o restante ao Vercel.

Não modificar essa configuração para uma alteração comum de frontend. Primeiro corrigir os caminhos no app e publicar pelo repositório.

## Verificação pós-deploy

Confirmar o commit remoto:

```bash
git ls-remote origin refs/heads/main
```

Verificar o alias Vercel e depois o domínio público:

```bash
curl -I https://dieta-matheusinho.vercel.app/
curl -I https://matheusinho.cloud/hungergames/
curl -I https://matheusinho.cloud/hungergames/manifest.webmanifest
curl -I https://matheusinho.cloud/hungergames/icons/icon-192.png
curl -I https://matheusinho.cloud/hungergames/icons/icon-512.png
curl -I https://matheusinho.cloud/hungergames/sw.js
```

Resultados esperados:

- página: `200` e `text/html`;
- manifest: `200` e `application/manifest+json`;
- ícones: `200` e `image/png`;
- service worker: `200` e `application/javascript`.

Para evitar confundir cache antigo com deploy incompleto, usar uma query de verificação, por exemplo `?v=<commit>`, e conferir no HTML a presença de `/hungergames/icons/...` e no bundle os marcadores do recurso recém-publicado.

## PWA no caminho publicado

O manifest deve manter:

- `start_url: '/hungergames/'`;
- `scope: '/hungergames/'`;
- ícones com URLs iniciando em `/hungergames/icons/`.

O service worker deve cachear os assets já com o prefixo `/hungergames`. O prompt de instalação só deve aparecer quando o navegador oferecer `beforeinstallprompt`, ou como instrução de compartilhamento no iOS; não exibir o toast quando o app já estiver em modo standalone.
