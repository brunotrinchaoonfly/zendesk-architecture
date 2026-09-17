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
          file: "diagrams/sunco/primeiro-contato/sequence.html",
          spec: "diagrams/sunco/primeiro-contato/sequence.json",
          description:
            "Sunshine Conversations + Zendesk. Lookup dinâmico de identidade via telefone: canal WhatsApp (mensagens/mídias/respostas), webhooks com nº de telefone, ENCONTRADO recupera ID + perfil · NÃO ACHOU cria perfil; perfil vinculado e controle inicial com Zendesk AI/Bot.",
          dot: "orange",
          paths: [
            { id: "cliente~waba", label: "Usuário → WABA (inbound)" },
            { id: "waba~sunco", label: "WABA → Sunco (webhook · phone)" },
            { id: "sunco~zendesk", label: "Sunco → Zendesk (lookup)" },
            { id: "zendesk~sunco", label: "Zendesk → Sunco (ID + perfil)" },
          ],
          lens: ["external", "cloud"],
        },
        architecture: {
          file: "diagrams/sunco/primeiro-contato/architecture.html",
          spec: "diagrams/sunco/primeiro-contato/architecture.json",
          description:
            "Arquitetura do primeiro contato: canal WhatsApp (mensagens · mídias · respostas via WABA), webhooks com nº de telefone para o Sunco (Switchboard), lookup dinâmico de identidade no Zendesk — ENCONTRADO recupera ID + perfil · NÃO ACHOU cria perfil — e controle inicial com Zendesk AI/Bot.",
          dot: "rose",
          paths: [
            { id: "cliente~waba", label: "Usuário → WABA (inbound)" },
            { id: "waba~sunco", label: "WABA → Sunco (webhook · phone)" },
            { id: "sunco~zendesk", label: "Sunco → Zendesk (lookup · cria perfil)" },
            { id: "zendesk~sunco", label: "Zendesk → Sunco (ID + perfil)" },
          ],
          lens: ["external", "cloud"],
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
          file: "diagrams/synczendesk/users/sequence.html",
          spec: "diagrams/synczendesk/users/sequence.json",
          description:
            "Sequência do sync-users baseada na arquitetura real (@2df5260): Cron → SyncUsersCmd/AbstractLoad → streamQuery BigQuery (delta 24h) → resolveZendeskOrganizationId (cache) → dedup Redis (TTL 300) → sendBatch lotes de 100 → createOrUpdateManyUsers → pollJobStatus (backoff 2/5/10/30s) → retry 429 ×3 → ZendeskUserSyncLog.",
          dot: "emerald",
          paths: [
            { id: "cron~cmd", label: "Cron → SyncUsersCmd" },
            { id: "cmd~bq", label: "Cmd → BigQuery (streamQuery)" },
            { id: "cmd~cache", label: "Cmd → Resolver/Redis (orgs · dedup)" },
            { id: "cmd~zs", label: "Cmd → ZendeskService (sendBatch)" },
            { id: "zs~zapi", label: "ZendeskService → Zendesk API (bulk · poll)" },
            { id: "zs~cmd", label: "ZendeskService → Cmd (sync log)" },
          ],
          lens: ["backend", "database", "external"],
        },
        architecture: {
          file: "diagrams/synczendesk/users/architecture.html",
          spec: "diagrams/synczendesk/users/architecture.json",
          description:
            "Arquitetura do sync-users (evidenciada no repo sync-zendesk @2df5260): cron dispara SyncUsersCmd → AbstractLoad carrega usuários alterados do BigQuery em lotes de 100 (Parallel), resolve organizations via resolvedOrgsCache, dedup no Redis, ZendeskService envia createOrUpdateManyUsers (bulk job via pollJobStatus), grava UserSyncLog no MySQL e mapeia perfis.",
          dot: "emerald",
          paths: [
            { id: "cron~cmd", label: "Cron → SyncUsersCmd" },
            { id: "cmd~abstract", label: "SyncUsersCmd → AbstractLoad" },
            { id: "abstract~bqsrv", label: "AbstractLoad → BigQueryService" },
            { id: "bqsrv~bq", label: "BigQueryService → BigQuery" },
            { id: "abstract~orgres", label: "AbstractLoad → resolvedOrgsCache" },
            { id: "orgres~zsrv", label: "resolvedOrgsCache → ZendeskService" },
            { id: "cmd~dedup", label: "SyncUsersCmd → Dedup (Redis)" },
            { id: "abstract~zsrv", label: "AbstractLoad → ZendeskService (sendBatch)" },
            { id: "zsrv~zapi", label: "ZendeskService → Zendesk API (bulk)" },
            { id: "zsrv~mysql", label: "ZendeskService → MySQL (UserSyncLog)" },
            { id: "abstract~mapper", label: "AbstractLoad → Mapper" },
          ],
          lens: ["backend", "database", "external"],
        },
      },
      {
        id: "organizations",
        title: "sync-zendesk — Sync de Organizações",
        short: "Sync de Organizações",
        sequence: {
          file: "diagrams/synczendesk/organizations/sequence.html",
          spec: "diagrams/synczendesk/organizations/sequence.json",
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
          file: "diagrams/synczendesk/organizations/architecture.html",
          spec: "diagrams/synczendesk/organizations/architecture.json",
          description:
            "Arquitetura do sync-organizations (repo @2df5260): Cron → SyncOrganizationsCmd (extends AbstractLoad) → BigQueryClientService streamQuery (SQL delta) → mapRow + buildDto → ZendeskService em Parallel → createMany/updateMany → updateLocalMapping; resume por synced_at hoje; dedup Redis (shouldPublish off).",
          dot: "violet",
          paths: [
            { id: "cron~cmd", label: "Cron → SyncOrganizationsCmd" },
            { id: "cmd~abstract", label: "Cmd → AbstractLoad (extends)" },
            { id: "abstract~bqsrv", label: "AbstractLoad → BigQueryClientService" },
            { id: "bqsrv~bq", label: "BigQueryClientService → BigQuery" },
            { id: "abstract~mapper", label: "AbstractLoad → Mapping Layer" },
            { id: "abstract~zsrv", label: "AbstractLoad → ZendeskService (Parallel)" },
            { id: "zsrv~zapi", label: "ZendeskService → Zendesk API" },
            { id: "zsrv~mapping", label: "ZendeskService → MySQL mapping" },
            { id: "cmd~mapping", label: "Cmd → MySQL mapping (resume)" },
            { id: "cmd~dedup", label: "Cmd → Dedup (shouldPublish off)" },
            { id: "dedup~redis", label: "Dedup → Redis (sha256 · TTL 30d)" },
          ],
          lens: ["backend", "database", "external"],
        },
      },
      {
        id: "messaging-token",
        title: "sync-zendesk — Messaging Token",
        short: "Messaging Token",
        sequence: {
          file: "diagrams/synczendesk/messaging-token/sequence.html",
          spec: "diagrams/synczendesk/messaging-token/sequence.json",
          description:
            "Sequência do Messaging Token: cliente solicita token ao middleware, validação da requisição, controle de token (issue/revoke), serviço gera/assina (config · JWT), consulta o Zendesk e devolve o token ao cliente e ao Zendesk.",
          dot: "emerald",
          paths: [
            { id: "client~mid", label: "Cliente → Middleware (solicita token)" },
            { id: "mid~ctl", label: "Middleware → Controle de token" },
            { id: "ctl~svc", label: "Controle → Serviço (gera/assina)" },
            { id: "svc~cfg", label: "Serviço → Config (segredos)" },
            { id: "svc~ctl", label: "Serviço → Controle (token assinado)" },
            { id: "ctl~mid", label: "Controle → Middleware" },
            { id: "mid~client", label: "Middleware → Cliente (token)" },
            { id: "client~zsdk", label: "Cliente → Zendesk (token)" },
          ],
          lens: ["external", "backend", "database"],
        },
        architecture: {
          file: "diagrams/synczendesk/messaging-token/architecture.html",
          spec: "diagrams/synczendesk/messaging-token/architecture.json",
          description:
            "Arquitetura do Messaging Token: cliente → middleware → validação da requisição → controle de token → serviço de assinatura (config · JWT) com consulta ao Zendesk.",
          dot: "emerald",
          paths: [
            { id: "client~mid", label: "Cliente → Middleware" },
            { id: "mid~val", label: "Middleware → Validação" },
            { id: "val~ctl", label: "Validação → Controle de token" },
            { id: "ctl~svc", label: "Controle → Serviço" },
            { id: "svc~cfg", label: "Serviço → Config" },
            { id: "svc~jwt", label: "Serviço → JWT" },
            { id: "ctl~client", label: "Controle → Cliente" },
            { id: "client~zsdk", label: "Cliente → Zendesk" },
          ],
          lens: ["external", "backend", "database"],
        },
      },
      {
        id: "email-conflict",
        title: "sync-zendesk — Conflito de E-mails",
        short: "Conflito de E-mails",
        sequence: {
          file: "diagrams/synczendesk/email-conflict/sequence.html",
          spec: "diagrams/synczendesk/email-conflict/sequence.json",
          description:
            "Sequência do sync-conflicting-user-emails baseada na arquitetura real (@2df5260): Cron → ConflictingEmailCmd lê falhas (status=Failure) do UserSyncLog, busca cadastros no BigQuery (external_id · e-mail), ZendeskService resolve casos A (merge) · B (update) · C (linka external_id) · D (falha manual) via Zendesk API com throttle, grava updateUserLocalMapping e reclassifica Failure → success.",
          dot: "amber",
          paths: [
            { id: "cron~cmd", label: "Cron → ConflictingEmailCmd" },
            { id: "cmd~synclog", label: "Cmd → UserSyncLog (seleciona falhas)" },
            { id: "synclog~cmd", label: "UserSyncLog → Cmd (registros)" },
            { id: "cmd~bq", label: "Cmd → BigQuery (payload · donos)" },
            { id: "cmd~zsrv", label: "Cmd → ZendeskService (buscar/resolver)" },
            { id: "zsrv~zapi", label: "ZendeskService → Zendesk API (update · merge)" },
            { id: "zsrv~synclog", label: "ZendeskService → UserSyncLog (mapping)" },
          ],
          lens: ["backend", "database", "external"],
        },
        architecture: {
          file: "diagrams/synczendesk/email-conflict/architecture.html",
          spec: "diagrams/synczendesk/email-conflict/architecture.json",
          description:
            "Arquitetura do sync-conflicting-user-emails (repo @2df5260): Cron → ConflictingEmailCmd lê falhas do UserSyncLog, busca payload e donos dos e-mails no BigQuery, resolve casos A/B/C via ZendeskService (merge · update · identities) com resolveZendeskUserId, grava update no mapping e agrupa relatório por caso.",
          dot: "amber",
          paths: [
            { id: "cron~cmd", label: "Cron → ConflictingEmailCmd" },
            { id: "synclog~cmd", label: "UserSyncLog → Cmd (falhas por e-mail)" },
            { id: "cmd~bqsrv", label: "Cmd → BigQueryClientService (payload)" },
            { id: "bqsrv~bq", label: "BigQueryClientService → BigQuery" },
            { id: "cmd~zsrv", label: "Cmd → ZendeskService (casos A·B·C)" },
            { id: "zsrv~zapi", label: "ZendeskService → Zendesk API (merge · update)" },
            { id: "zsrv~synclog", label: "ZendeskService → UserSyncLog (mapping)" },
            { id: "zsrv~mapper", label: "ZendeskService → Mapping Layer" },
            { id: "cmd~report", label: "Cmd → Relatório (agrupa por caso)" },
          ],
          lens: ["backend", "database", "external"],
        },
      },
    ],
  },
  {
    id: "gambet",
    label: "Gambit",
    items: [
      {
        id: "gambit",
        title: "Gambit — Passagem de Controle e Histórico",
        short: "Gambit",
        sequence: {
          file: "diagrams/gambet/gambit/sequence.html",
          spec: "diagrams/gambet/gambit/sequence.json",
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
          file: "diagrams/gambet/gambit/architecture.html",
          spec: "diagrams/gambet/gambit/architecture.json",
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
    label: "Fluxos",
    items: [
      {
        id: "passcontrol",
        title: "PassControl <-> Gambit",
        short: "PassControl <-> Gambit",
        sequence: {
          file: "diagrams/fluxo/passcontrol/sequence.html",
          spec: "diagrams/fluxo/passcontrol/sequence.json",
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
          file: "diagrams/fluxo/passcontrol/architecture.html",
          spec: "diagrams/fluxo/passcontrol/architecture.json",
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
