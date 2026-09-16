/**
 * Archify Present — registry hierárquico.
 *
 * Estrutura: Grupo → Item → tipo (sequence | architecture).
 * Cada item referencia os dois tipos com { file, spec, description, dot, paths, lens }.
 * Tipo ausente = chave omitida (UI mostra sub-botão desabilitado).
 *
 * Para adicionar uma nova arquitetura/sequência:
 *   1. Gere o HTML:
 *      node .claude/skills/archify/bin/archify.mjs deliver <type> <spec>.json \
 *        diagrams/<GRUPO>/<ITEM>/<type>.html --quality showcase
 *   2. Preencha o objeto do tipo no item correspondente.
 *
 * `paths` — pares de ids (route probe dirigido do viewer: #route=A~B).
 * `lens`  — semantic kinds disponíveis no diagrama.
 */
window.ARCHIFY_GROUPS = [
  {
    id: "sunco",
    label: "Sunco",
    items: [
      {
        id: "primeiro-contato",
        title: "SunCo — Primeiro Contato sem Perfil",
        short: "Primeiro Contato",
        sequence: {
          file: "../diagrams/sunco/primeiro-contato/sequence.html",
          spec: "../diagrams/sunco/primeiro-contato/sequence.json",
          description:
            "Sunshine Conversations + Zendesk. Enriquecimento de perfil do appUser na primeira mensagem: extrai phone, busca no Zendesk e grava profile/externalId no Sunco.",
          dot: "orange",
          paths: [
            { id: "whatsapp~sunco", label: "Usuário → Sunco (inbound)" },
            { id: "whatsapp~middleware", label: "Usuário → Middleware (webhook)" },
            { id: "whatsapp~zendesk", label: "Usuário → Search API (fim a fim)" },
            { id: "sunco~middleware", label: "Sunco → Middleware" },
            { id: "middleware~zendesk", label: "Middleware → Search API" },
          ],
          lens: ["external", "cloud", "backend"],
        },
        architecture: {
          file: "../diagrams/sunco/primeiro-contato/architecture.html",
          spec: "../diagrams/sunco/primeiro-contato/architecture.json",
          description:
            "Arquitetura do primeiro contato sem perfil: Usuário WhatsApp → Sunshine Conversations recebe inbound e dispara webhook → Middleware (Webhook Service) consulta a Zendesk Search API pelo telefone (Basic Auth/OAuth), recebe perfil + external_id e grava de volta no Sunco (PATCH profile · externalId). Executado 1× por novo usuário sem cadastro prévio.",
          dot: "rose",
          paths: [
            { id: "whatsapp~sunco", label: "Usuário → Sunco (inbound)" },
            { id: "sunco~middleware", label: "Sunco → Middleware (webhook)" },
            { id: "middleware~zendesk", label: "Middleware → Search API (busca phone)" },
            { id: "zendesk~middleware", label: "Search API → Middleware (perfil)" },
            { id: "middleware~sunco", label: "Middleware → Sunco (PATCH)" },
            { id: "sunco~whatsapp", label: "Sunco → Usuário (atendimento)" },
          ],
          lens: ["external", "cloud", "backend"],
        },
      },
    ],
  },
  {
    id: "synczendesk",
    label: "Sync Zendesk",
    items: [
      {
        id: "users",
        title: "sync-zendesk — Sync de Usuários",
        short: "Sync de Usuários",
        sequence: {
          file: "../diagrams/synczendesk/users/sequence.html",
          spec: "../diagrams/synczendesk/users/sequence.json",
          description:
            "Sequência do sync-users: console dispara o comando, usuários alterados no BigQuery são carregados em lotes de 100 via Parallel, organization_id resolvido em tempo real (resolvedOrgsCache), createOrUpdateManyUsers enviado em bulk, job acompanhado via pollJobStatus e resultado gravado no ZendeskUserSyncLog. Sem dedup; sempre resume.",
          dot: "emerald",
          paths: [
            { id: "console~cmd", label: "Console → SyncUsersCmd" },
            { id: "cmd~base", label: "SyncUsersCmd → AbstractLoad" },
            { id: "base~bq", label: "AbstractLoad → BigQuery (streamQuery)" },
            { id: "base~syncLog", label: "AbstractLoad → UserSyncLog (log)" },
            { id: "base~zs", label: "AbstractLoad → ZendeskService (sendBatch)" },
            { id: "zs~zendesk", label: "ZendeskService → Zendesk API (bulk)" },
          ],
          lens: ["backend", "database", "external"],
        },
        architecture: {
          file: "../diagrams/synczendesk/users/architecture.html",
          spec: "../diagrams/synczendesk/users/architecture.json",
          description:
            "bigquery:sync-users — usuários alterados no BigQuery em lotes de 100 via Parallel; resolve organization_id em tempo real (resolvedOrgsCache) e envia createOrUpdateManyUsers; acompanha job via pollJobStatus e grava ZendeskUserSyncLog. Sem dedup; sempre resume.",
          dot: "emerald",
          paths: [
            { id: "console~cmd", label: "Hyperf Console → SyncUsersCmd" },
            { id: "cmd~base", label: "SyncUsersCmd → AbstractLoad" },
            { id: "base~bqClient", label: "AbstractLoad → BigQueryClient (streamQuery)" },
            { id: "bqClient~bq", label: "BigQueryClient → BigQuery (SQL)" },
            { id: "base~zs", label: "AbstractLoad → ZendeskService (sendBatch)" },
            { id: "zs~zendesk", label: "ZendeskService → Zendesk API (bulk job)" },
            { id: "base~syncLog", label: "AbstractLoad → UserSyncLog (resume · log)" },
          ],
          lens: ["backend", "database", "external"],
        },
      },
      {
        id: "organizations",
        title: "sync-zendesk — Sync de Organizações",
        short: "Sync de Organizações",
        sequence: {
          file: "../diagrams/synczendesk/organizations/sequence.html",
          spec: "../diagrams/synczendesk/organizations/sequence.json",
          description:
            "Sequência do sync-organizations: pula organizations já sincronizadas no dia (loadAlreadySyncedIds), separa create × update por created_at/updated_at, dedup Redis (shouldPublish/markPublished), envia createManyOrganizations/updateManyOrganizations e persiste zendesk_organization_id no mapping.",
          dot: "violet",
          paths: [
            { id: "console~cmd", label: "Console → SyncOrgCmd" },
            { id: "cmd~mapping", label: "SyncOrgCmd → Org Mapping (resume)" },
            { id: "cmd~bq", label: "SyncOrgCmd → BigQuery (streamQuery)" },
            { id: "cmd~dedup", label: "SyncOrgCmd → Dedup (shouldPublish)" },
            { id: "cmd~zs", label: "SyncOrgCmd → ZendeskService (sendBatch)" },
            { id: "zs~zendesk", label: "ZendeskService → Zendesk API (bulk)" },
            { id: "zs~mapping", label: "ZendeskService → Org Mapping (persist id)" },
          ],
          lens: ["backend", "database", "external"],
        },
        architecture: {
          file: "../diagrams/synczendesk/organizations/architecture.html",
          spec: "../diagrams/synczendesk/organizations/architecture.json",
          description:
            "bigquery:sync-organizations — pula organizations já sincronizadas no dia (loadAlreadySyncedIds), separa create × update por created_at/updated_at, dedup Redis (shouldPublish/markPublished) e envia createManyOrganizations/updateManyOrganizations; persiste zendesk_organization_id no mapping.",
          dot: "violet",
          paths: [
            { id: "console~cmd", label: "Hyperf Console → SyncOrgCmd" },
            { id: "cmd~base", label: "SyncOrgCmd → AbstractLoad" },
            { id: "base~bqClient", label: "AbstractLoad → BigQueryClient (streamQuery)" },
            { id: "bqClient~bq", label: "BigQueryClient → BigQuery (SQL)" },
            { id: "base~dedup", label: "AbstractLoad → Dedup Service (shouldPublish)" },
            { id: "base~zs", label: "AbstractLoad → ZendeskService (sendBatch)" },
            { id: "zs~zendesk", label: "ZendeskService → Zendesk API (bulk job)" },
            { id: "base~mapping", label: "AbstractLoad → OrganizationMapping (resume)" },
            { id: "zs~mapping", label: "ZendeskService → OrganizationMapping (persist id)" },
          ],
          lens: ["backend", "database", "external"],
        },
      },
      {
        id: "email-conflict",
        title: "sync-zendesk — Conflito de E-mails",
        short: "Conflito de E-mails",
        sequence: {
          file: "../diagrams/synczendesk/email-conflict/sequence.html",
          spec: "../diagrams/synczendesk/email-conflict/sequence.json",
          description:
            "Sequência do sync-conflicting-user-emails: UserSyncLog failures (status=Failure) alimentam o comando, payload buscado no BigQuery, casos A (merge) / B (update mesmo cadastro) / C (linka external_id) / D (falha manual) resolvidos via ZendeskService, mapping local gravado e relatório .md opcional (--report/--dry-run).",
          dot: "amber",
          paths: [
            { id: "console~cmd", label: "Console → ConflictingEmailCmd" },
            { id: "syncLog~cmd", label: "UserSyncLog → Cmd (failures)" },
            { id: "cmd~syncLog", label: "Cmd → UserSyncLog (success)" },
            { id: "cmd~bq", label: "Cmd → BigQuery (fetch payload)" },
            { id: "cmd~zs", label: "Cmd → ZendeskService (A·B·C)" },
            { id: "zs~zendesk", label: "ZendeskService → Zendesk API" },
            { id: "zs~mapping", label: "ZendeskService → Local mapping" },
          ],
          lens: ["backend", "database", "external"],
        },
        architecture: {
          file: "../diagrams/synczendesk/email-conflict/architecture.html",
          spec: "../diagrams/synczendesk/email-conflict/architecture.json",
          description:
            "zendesk:sync-conflicting-user-emails — reprocessa ZendeskUserSyncLog com status=Failure (UserUpdateError): busca cadastro por external_id e/ou e-mail, decide caso A (merge), B (update no mesmo cadastro), C (linka external_id) ou D (falha manual), sincroniza org/nome, grava local mapping e emite relatório .md opcional (--report/--dry-run).",
          dot: "amber",
          paths: [
            { id: "console~cmd", label: "Hyperf Console → ConflictingEmailCmd" },
            { id: "syncLog~cmd", label: "UserSyncLog → ConflictingEmailCmd (failures)" },
            { id: "cmd~syncLog", label: "ConflictingEmailCmd → UserSyncLog (success)" },
            { id: "cmd~bq", label: "ConflictingEmailCmd → BigQuery (fetch payload)" },
            { id: "cmd~zs", label: "ConflictingEmailCmd → ZendeskService (A·B·C)" },
            { id: "zs~zendesk", label: "ZendeskService → Zendesk API (update · merge)" },
            { id: "zs~mapping", label: "ZendeskService → Local mapping (local id)" },
          ],
          lens: ["backend", "database", "external"],
        },
      },
    ],
  },
  {
    id: "gambet",
    label: "Gambet",
    items: [
      {
        id: "gambit",
        title: "Gambit — Passagem de Controle e Histórico",
        short: "Gambit",
        sequence: {
          file: "../diagrams/gambet/gambit/sequence.html",
          spec: "../diagrams/gambet/gambit/sequence.json",
          description:
            "Passagem de controle dos fluxos para o Gambit: webhook com horário de início, recuperação do histórico via Zendesk (intermediário), conversa intermediada e desfechos com tag de deflexão (encerra ticket) ou tag de transferência (atendimento humano).",
          dot: "cyan",
          paths: [
            { id: "client~flows", label: "Cliente → Fluxos" },
            { id: "flows~gambit", label: "Fluxos → Gambit (passagem)" },
            { id: "gambit~zendesk", label: "Gambit → Zendesk (API)" },
            { id: "client~zendesk", label: "Cliente → Zendesk (mensagem)" },
            { id: "zendesk~agent", label: "Zendesk → Atendimento humano" },
          ],
          lens: ["external", "cloud"],
        },
        architecture: {
          file: "../diagrams/gambet/gambit/architecture.html",
          spec: "../diagrams/gambet/gambit/architecture.json",
          description:
            "Arquitetura do Gambit (IA com contexto Onfly): Fluxos passam o controle via webhook, Gambit recupera o histórico pelo Zendesk (intermediário), conversa intermediada — mensagem do cliente → Zendesk → webhook → resposta via API Zendesk — e desfechos com tag de deflexão (encerra ticket) ou transferência (ticket ao grupo de atendimento humano).",
          dot: "cyan",
          paths: [
            { id: "client~flows", label: "Cliente → Fluxos" },
            { id: "flows~gambit", label: "Fluxos → Gambit (passagem)" },
            { id: "gambit~zendesk", label: "Gambit → Zendesk (API)" },
            { id: "zendesk~gambit", label: "Zendesk → Gambit (webhook)" },
            { id: "client~zendesk", label: "Cliente → Zendesk (mensagem)" },
            { id: "zendesk~agent", label: "Zendesk → Atendimento humano" },
          ],
          lens: ["external", "cloud", "backend"],
        },
      },
    ],
  },
  {
    id: "fluxo",
    label: "Fluxo",
    items: [
      {
        id: "passcontrol",
        title: "PassControl",
        short: "PassControl",
        sequence: {
          file: "../diagrams/fluxo/passcontrol/sequence.html",
          spec: "../diagrams/fluxo/passcontrol/sequence.json",
          description:
            "Sequência fim-a-fim via Sunco Switchboard: inbound WhatsApp, lookup de identidade no Zendesk (ENCONTRADO recupera perfil · NÃO ACHOU cria), Rota A (humano) ou Rota B — release pelo PassControl troca Zendesk PASSIVO × Gambit ATIVO, Gambit recupera histórico, responde com ações e devolve o controle com tag de deflexão (encerra ticket) ou transferência (roteia grupo/agente).",
          dot: "slate",
          paths: [
            { id: "cliente~sunco", label: "Usuário → Sunco (inbound)" },
            { id: "sunco~bot", label: "Sunco → Bot (lookup identidade)" },
            { id: "bot~passcontrol", label: "Bot → PassControl (Rota B · release)" },
            { id: "passcontrol~gambit", label: "PassControl → Gambit (webhook)" },
            { id: "gambit~bot", label: "Gambit → Bot (histórico)" },
            { id: "cliente~gambit", label: "Usuário → Gambit (via Zendesk)" },
            { id: "gambit~passcontrol", label: "Gambit → PassControl (return + tag)" },
            { id: "passcontrol~agentws", label: "PassControl → Workspace (tags)" },
            { id: "agentws~cliente", label: "Atendente → Usuário" },
          ],
          lens: ["external", "cloud", "backend"],
        },
        architecture: {
          file: "../diagrams/fluxo/passcontrol/architecture.html",
          spec: "../diagrams/fluxo/passcontrol/architecture.json",
          description:
            "Arquitetura do PassControl via Sunco Switchboard: Sunshine Conversations faz lookup de identidade no Zendesk; bot decide entre Rota A (humano) e Rota B — release control troca Zendesk PASSIVO × Gambit ATIVO; Gambit (IA com contexto Onfly) recupera histórico, responde com ações e devolve com tag de deflexão ou transferência ao Agent Workspace.",
          dot: "rose",
          paths: [
            { id: "cliente~waba", label: "Usuário → WhatsApp Business API" },
            { id: "waba~sunco", label: "WABA → Sunco (webhook · phone)" },
            { id: "sunco~bot", label: "Sunco → Bot (lookup · controle)" },
            { id: "bot~agentws", label: "Bot → Workspace (Rota A · transferência)" },
            { id: "bot~passcontrol", label: "Bot → PassControl (Rota B · release)" },
            { id: "passcontrol~sunco", label: "PassControl → Sunco (switchboard)" },
            { id: "passcontrol~gambit", label: "PassControl → Gambit (webhook)" },
            { id: "gambit~bot", label: "Gambit → Bot (histórico · API)" },
            { id: "gambit~passcontrol", label: "Gambit → PassControl (return + tag)" },
            { id: "bot~ticket", label: "Bot → Ticket (deflexão · encerra)" },
          ],
          lens: ["external", "cloud", "backend", "database"],
        },
      },
    ],
  },
];
