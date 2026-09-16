# Archify Present

Página de apresentação (shell) para as arquiteturas geradas pela skill **Archify**.
Layout limpo acompanhando o estilo do viewer (Classic por padrão; presets Signal
Flow, Blueprint e Editorial continuam disponíveis dentro de cada diagrama, no
menu de preset do próprio viewer).

**i18n:** a skill agora suporta `meta.locale: "pt-BR"` (além de `en` e
`zh-CN`) — UI do viewer (dock, tooltips, guia, exportação, acessibilidade) em
português. Configure `"locale": "pt-BR"` no `meta` da spec antes do `deliver`.
O conteúdo autoral (títulos, labels, cards) nunca é traduzido pelo renderer.

## Estrutura

```
architecture-onfly/
├── presentation/               # este projeto (shell de apresentação)
│   ├── index.html              # página principal: seleção + container
│   ├── registry.js             # manifesto agrupado: { GRUPO: [arquitetura, ...] }
│   ├── sync-diagrams.mjs       # injeção única do modo shell em diagramas antigos
│   └── assets/
│       ├── shell.css
│       └── shell.js
└── diagrams/                   # saída padrão da skill archify (deliver)
    └── GRUPO/ARQUITETURA/      # uma pasta por arquitetura
        ├── <id>.html           # diagrama self-contained (viewer completo)
        └── <id>.json           # spec congelada
```

## Diagramas antigos (modo shell injetado)

Diagramas entregues com um template anterior ao modo `shell` recebem a injeção
por um único comando:

```bash
node presentation/sync-diagrams.mjs
```

- Fonte única: `assets/template.html` da skill (o CSS shell é extraído dele).
- Idempotente: marca com `id="archify-shell-mode:<hash>"` e substitui o bloco
  se o hash do template mudar — basta rodar de novo depois de alterar o
  template.
- Pula diagramas que já têm o modo nativo e os sidecars `*.visual-check.html`.
- **i18n (locale) não é injetável** — é embutido no build. Para diagramas
  antigos em pt-BR, re-entregue com `deliver` usando a spec (`meta.locale`).

## Como usar

```bash
# opção 1 — file:// (funciona direto)
xdg-open presentation/index.html

# opção 2 — http local
python3 -m http.server 8080
# abra http://localhost:8080/presentation/
```

## Controles

| Onde | Controle | Ação | Mecanismo |
|---|---|---|---|
| Topbar (shell) | Seleção (sidebar) | Carrega diagrama no container | `iframe.src` |
| Topbar (shell) | Tema Clean/Dark | Altera shell **e** diagrama | `?theme=light\|dark` |
| Topbar (shell) | Apresentar | Esconde sidebar, foca o diagrama | `?present=1` + classe shell |
| Topbar (shell) | Abrir standalone | Viewer completo em nova aba | link direto |
| Topbar (shell) | Ver spec JSON | Abre a spec congelada | link direto |
| Container (viewer) | Dock PATH/MAP/LENS | Route probe, radar, lente | nativo do viewer |
| Container (viewer) | Zoom −/100%/+ + drag | Zoom e pan do diagrama | nativo (>100% = pan) |
| Container (viewer) | Click em elemento | Semantic Passport | nativo |
| Container (viewer) | Exportar ⌄ | Menu de export completo | nativo (`?openExport=1` disponível) |

> **Modo `shell=1` (alteração na skill archify):** `assets/template.html` do
> viewer ganhou o query param `?shell=1` → atributo `data-shell="true"` no
> `<html>`. Esconde o chrome de página do viewer (header/título, subtitle,
> toolbar, cards, guided views, node finder, diagram guide) **sem bloquear
> interações** — diferente do `?embed=1`, que é one-shot/estático. O que
> permanece nativo e funcional dentro do container (estilo do próprio
> template): **dock** PATH/MAP/LENS/zoom, **Semantic Passport** (abre ao
> clicar em um elemento), **overview map** (botão MAP do dock — visão geral
> navegável), painéis **Route Probe** e **Semantic Lens**, focus chips e
> overlays. Pan com drag fica disponível quando o zoom interno está acima de
> 100% (comportamento nativo do viewer).

> **Nota (Map):** o botão Map vive no dock do viewer (dentro do container) e
> abre o overview map nativo — modal com o mapa completo para navegação. O
> Reading Depth interno (MAP abaixo de 100%) não é controlável via URL.

## Adicionar nova arquitetura

1. Crie a spec JSON (formato Archify) e entregue em `diagrams/<GRUPO>/<ARQUITETURA>/`:

   ```bash
   node .claude/skills/archify/bin/archify.mjs deliver <type> <spec>.json \
     diagrams/<GRUPO>/<ARQUITETURA>/<id>.html --quality showcase
   ```

2. Adicione o objeto no array do grupo em `presentation/registry.js`:

   ```js
   window.ARCHIFY_REGISTRY = {
     GRUPO: [
       {
         id: "<id>",
         title: "Título completo",
         short: "Nome curto",
         type: "sequence|workflow|architecture|...",
         file: "../diagrams/<GRUPO>/<ARQUITETURA>/<id>.html",
         spec: "../diagrams/<GRUPO>/<ARQUITETURA>/<id>.json",
         description: "Uma linha explicando o fluxo.",
         dot: "cyan|emerald|violet|amber|rose|orange|slate",
         paths: [ { id: "A~B", label: "Origem → Destino" } ],  // participant ids da spec
         lens: ["external", "cloud", "backend"]                // component types usados
       }
     ]
   };
   ```

3. Diagrama antigo (template anterior)? Rode `node presentation/sync-diagrams.mjs`.

4. A página carrega automaticamente pelo registry (JS, sem build, sem servidor
   obrigatório — funciona em `file://` porque o registry é `registry.js` e não
   um `fetch` de JSON).

## API de URL do viewer usada

Descoberta por inspeção do viewer entregue (não documentada no runtime reference):
`theme`, `embed`, `present`, `openExport`, `play` (query); `route`, `lens`,
`focus`, `view`, `beat`, `relation`, `reach` (hash, separador `~`).
