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
    "id": "sunco",
    "label": "Sunco",
    "items": [
      {
        "id": "primeiro-contato",
        "title": "SunCo — Primeiro Contato sem Perfil",
        "short": "Primeiro Contato",
        "sequence": {
          "file": "diagrams/sunco/primeiro-contato/sequence.html",
          "spec": "diagrams/sunco/primeiro-contato/sequence.json",
          "description": "Primeiro contato via WhatsApp: Sunco (Switchboard) faz o lookup de identidade no Zendesk pelo telefone. ENCONTRADO recupera ID e perfil; NÃO ACHOU cria o perfil.",
          "dot": "orange",
          "paths": [
            {
              "id": "cliente~waba",
              "label": "Usuário → WABA (inbound)"
            },
            {
              "id": "waba~sunco",
              "label": "WABA → Sunco (webhook · phone)"
            },
            {
              "id": "sunco~zendesk",
              "label": "Sunco → Zendesk (lookup)"
            },
            {
              "id": "zendesk~sunco",
              "label": "Zendesk → Sunco (ID + perfil)"
            }
          ],
          "lens": [
            "external",
            "cloud"
          ]
        },
        "architecture": {
          "file": "diagrams/sunco/primeiro-contato/architecture.html",
          "spec": "diagrams/sunco/primeiro-contato/architecture.json",
          "description": "Canal WhatsApp conecta o usuário ao Sunshine Conversations. O Switchboard consulta o Zendesk pelo telefone e vincula o perfil — controle inicial com Zendesk AI/Bot.",
          "dot": "rose",
          "paths": [
            {
              "id": "cliente~waba",
              "label": "Usuário → WABA (inbound)"
            },
            {
              "id": "waba~sunco",
              "label": "WABA → Sunco (webhook · phone)"
            },
            {
              "id": "sunco~zendesk",
              "label": "Sunco → Zendesk (lookup · cria perfil)"
            },
            {
              "id": "zendesk~sunco",
              "label": "Zendesk → Sunco (ID + perfil)"
            }
          ],
          "lens": [
            "external",
            "cloud"
          ]
        }
      }
    ]
  },
  {
    "id": "synczendesk",
    "label": "Sync Zendesk",
    "items": [
      {
        "id": "users",
        "title": "sync-zendesk — Sync de Usuários",
        "short": "Sync de Usuários",
        "sequence": {
          "file": "diagrams/synczendesk/users/sequence.html",
          "spec": "diagrams/synczendesk/users/sequence.json",
          "description": "Sincroniza usuários do BigQuery para o Zendesk em lotes de 100. Inclui dedup Redis, retry com backoff e log por usuário.",
          "dot": "emerald",
          "paths": [
            {
              "id": "cron~cmd",
              "label": "Cron → SyncUsersCmd"
            },
            {
              "id": "cmd~bq",
              "label": "Cmd → BigQuery (streamQuery)"
            },
            {
              "id": "cmd~cache",
              "label": "Cmd → Resolver/Redis (orgs · dedup)"
            },
            {
              "id": "cmd~zs",
              "label": "Cmd → ZendeskService (sendBatch)"
            },
            {
              "id": "zs~zapi",
              "label": "ZendeskService → Zendesk API (bulk · poll)"
            },
            {
              "id": "zs~cmd",
              "label": "ZendeskService → Cmd (sync log)"
            }
          ],
          "lens": [
            "backend",
            "database",
            "external"
          ]
        },
        "architecture": {
          "file": "diagrams/synczendesk/users/architecture.html",
          "spec": "diagrams/synczendesk/users/architecture.json",
          "description": "Pipeline do sync-users: AbstractLoad lê o BigQuery, organiza com resolvedOrgsCache e despacha via ZendeskService. Job acompanhado por pollJobStatus com log no MySQL.",
          "dot": "emerald",
          "paths": [
            {
              "id": "cron~cmd",
              "label": "Cron → SyncUsersCmd"
            },
            {
              "id": "cmd~abstract",
              "label": "SyncUsersCmd → AbstractLoad"
            },
            {
              "id": "abstract~bqsrv",
              "label": "AbstractLoad → BigQueryService"
            },
            {
              "id": "bqsrv~bq",
              "label": "BigQueryService → BigQuery"
            },
            {
              "id": "abstract~orgres",
              "label": "AbstractLoad → resolvedOrgsCache"
            },
            {
              "id": "orgres~zsrv",
              "label": "resolvedOrgsCache → ZendeskService"
            },
            {
              "id": "cmd~dedup",
              "label": "SyncUsersCmd → Dedup (Redis)"
            },
            {
              "id": "abstract~zsrv",
              "label": "AbstractLoad → ZendeskService (sendBatch)"
            },
            {
              "id": "zsrv~zapi",
              "label": "ZendeskService → Zendesk API (bulk)"
            },
            {
              "id": "zsrv~mysql",
              "label": "ZendeskService → MySQL (UserSyncLog)"
            },
            {
              "id": "abstract~mapper",
              "label": "AbstractLoad → Mapper"
            }
          ],
          "lens": [
            "backend",
            "database",
            "external"
          ]
        }
      },
      {
        "id": "organizations",
        "title": "sync-zendesk — Sync de Organizações",
        "short": "Sync de Organizações",
        "sequence": {
          "file": "diagrams/synczendesk/organizations/sequence.html",
          "spec": "diagrams/synczendesk/organizations/sequence.json",
          "description": "Sincroniza organizações do BigQuery para o Zendesk. Separa creates e updates, aplica dedup e persiste o mapeamento.",
          "dot": "violet",
          "paths": [
            {
              "id": "console~cmd",
              "label": "Console → SyncOrgCmd"
            },
            {
              "id": "cmd~mapping",
              "label": "SyncOrgCmd → Org Mapping (resume)"
            },
            {
              "id": "cmd~bq",
              "label": "SyncOrgCmd → BigQuery (streamQuery)"
            },
            {
              "id": "cmd~dedup",
              "label": "SyncOrgCmd → Dedup (shouldPublish)"
            },
            {
              "id": "cmd~zs",
              "label": "SyncOrgCmd → ZendeskService (sendBatch)"
            },
            {
              "id": "zs~zendesk",
              "label": "ZendeskService → Zendesk API (bulk)"
            },
            {
              "id": "zs~mapping",
              "label": "ZendeskService → Org Mapping (persist id)"
            }
          ],
          "lens": [
            "backend",
            "database",
            "external"
          ]
        },
        "architecture": {
          "file": "diagrams/synczendesk/organizations/architecture.html",
          "spec": "diagrams/synczendesk/organizations/architecture.json",
          "description": "Pipeline do sync-organizations: AbstractLoad lê o BigQuery, mapeia e despacha via ZendeskService em Parallel. Resume pelo synced_at do dia e grava o mapeamento local.",
          "dot": "violet",
          "paths": [
            {
              "id": "cron~cmd",
              "label": "Cron → SyncOrganizationsCmd"
            },
            {
              "id": "cmd~abstract",
              "label": "Cmd → AbstractLoad (extends)"
            },
            {
              "id": "abstract~bqsrv",
              "label": "AbstractLoad → BigQueryClientService"
            },
            {
              "id": "bqsrv~bq",
              "label": "BigQueryClientService → BigQuery"
            },
            {
              "id": "abstract~mapper",
              "label": "AbstractLoad → Mapping Layer"
            },
            {
              "id": "abstract~zsrv",
              "label": "AbstractLoad → ZendeskService (Parallel)"
            },
            {
              "id": "zsrv~zapi",
              "label": "ZendeskService → Zendesk API"
            },
            {
              "id": "zsrv~mapping",
              "label": "ZendeskService → MySQL mapping"
            },
            {
              "id": "cmd~mapping",
              "label": "Cmd → MySQL mapping (resume)"
            },
            {
              "id": "cmd~dedup",
              "label": "Cmd → Dedup (shouldPublish off)"
            },
            {
              "id": "dedup~redis",
              "label": "Dedup → Redis (sha256 · TTL 30d)"
            }
          ],
          "lens": [
            "backend",
            "database",
            "external"
          ]
        }
      },
      {
        "id": "messaging-token",
        "title": "sync-zendesk — Messaging Token",
        "short": "Messaging Token",
        "sequence": {
          "file": "diagrams/synczendesk/messaging-token/sequence.html",
          "spec": "diagrams/synczendesk/messaging-token/sequence.json",
          "description": "Fluxo de emissão de token: cliente → middleware → validação → controle → serviço (config · JWT). Token entregue ao cliente e ao Zendesk.",
          "dot": "emerald",
          "paths": [
            {
              "id": "client~mid",
              "label": "Cliente → Middleware (solicita token)"
            },
            {
              "id": "mid~ctl",
              "label": "Middleware → Controle de token"
            },
            {
              "id": "ctl~svc",
              "label": "Controle → Serviço (gera/assina)"
            },
            {
              "id": "svc~cfg",
              "label": "Serviço → Config (segredos)"
            },
            {
              "id": "svc~ctl",
              "label": "Serviço → Controle (token assinado)"
            },
            {
              "id": "ctl~mid",
              "label": "Controle → Middleware"
            },
            {
              "id": "mid~client",
              "label": "Middleware → Cliente (token)"
            },
            {
              "id": "client~zsdk",
              "label": "Cliente → Zendesk (token)"
            }
          ],
          "lens": [
            "external",
            "backend",
            "database"
          ]
        },
        "architecture": {
          "file": "diagrams/synczendesk/messaging-token/architecture.html",
          "spec": "diagrams/synczendesk/messaging-token/architecture.json",
          "description": "Serviço de tokens de messaging: middleware com validação, controle de emissão e assinatura JWT, apoiado por configuração e consulta ao Zendesk.",
          "dot": "emerald",
          "paths": [
            {
              "id": "client~mid",
              "label": "Cliente → Middleware"
            },
            {
              "id": "mid~val",
              "label": "Middleware → Validação"
            },
            {
              "id": "val~ctl",
              "label": "Validação → Controle de token"
            },
            {
              "id": "ctl~svc",
              "label": "Controle → Serviço"
            },
            {
              "id": "svc~cfg",
              "label": "Serviço → Config"
            },
            {
              "id": "svc~jwt",
              "label": "Serviço → JWT"
            },
            {
              "id": "ctl~client",
              "label": "Controle → Cliente"
            },
            {
              "id": "client~zsdk",
              "label": "Cliente → Zendesk"
            }
          ],
          "lens": [
            "external",
            "backend",
            "database"
          ]
        }
      },
      {
        "id": "email-conflict",
        "title": "sync-zendesk — Conflito de E-mails",
        "short": "Conflito de E-mails",
        "sequence": {
          "file": "diagrams/synczendesk/email-conflict/sequence.html",
          "spec": "diagrams/synczendesk/email-conflict/sequence.json",
          "description": "Reprocessa falhas de e-mail do UserSyncLog com os casos A (merge), B (update) e C (linka external_id). Busca cadastros no BigQuery e aplica correções via Zendesk API.",
          "dot": "amber",
          "paths": [
            {
              "id": "cron~cmd",
              "label": "Cron → ConflictingEmailCmd"
            },
            {
              "id": "cmd~synclog",
              "label": "Cmd → UserSyncLog (seleciona falhas)"
            },
            {
              "id": "synclog~cmd",
              "label": "UserSyncLog → Cmd (registros)"
            },
            {
              "id": "cmd~bq",
              "label": "Cmd → BigQuery (payload · donos)"
            },
            {
              "id": "cmd~zsrv",
              "label": "Cmd → ZendeskService (buscar/resolver)"
            },
            {
              "id": "zsrv~zapi",
              "label": "ZendeskService → Zendesk API (update · merge)"
            },
            {
              "id": "zsrv~synclog",
              "label": "ZendeskService → UserSyncLog (mapping)"
            }
          ],
          "lens": [
            "backend",
            "database",
            "external"
          ]
        },
        "architecture": {
          "file": "diagrams/synczendesk/email-conflict/architecture.html",
          "spec": "diagrams/synczendesk/email-conflict/architecture.json",
          "description": "ConflictingEmailCmd lê as falhas do UserSyncLog e cruza donos de e-mail no BigQuery. ZendeskService aplica merge, update ou vínculo de external_id por caso.",
          "dot": "amber",
          "paths": [
            {
              "id": "cron~cmd",
              "label": "Cron → ConflictingEmailCmd"
            },
            {
              "id": "synclog~cmd",
              "label": "UserSyncLog → Cmd (falhas por e-mail)"
            },
            {
              "id": "cmd~bqsrv",
              "label": "Cmd → BigQueryClientService (payload)"
            },
            {
              "id": "bqsrv~bq",
              "label": "BigQueryClientService → BigQuery"
            },
            {
              "id": "cmd~zsrv",
              "label": "Cmd → ZendeskService (casos A·B·C)"
            },
            {
              "id": "zsrv~zapi",
              "label": "ZendeskService → Zendesk API (merge · update)"
            },
            {
              "id": "zsrv~synclog",
              "label": "ZendeskService → UserSyncLog (mapping)"
            },
            {
              "id": "zsrv~mapper",
              "label": "ZendeskService → Mapping Layer"
            },
            {
              "id": "cmd~report",
              "label": "Cmd → Relatório (agrupa por caso)"
            }
          ],
          "lens": [
            "backend",
            "database",
            "external"
          ]
        }
      }
    ]
  },
  {
    "id": "gambet",
    "label": "Gambit",
    "items": [
      {
        "id": "gambit",
        "title": "Gambit — Passagem de Controle e Histórico",
        "short": "Gambit",
        "sequence": {
          "file": "diagrams/gambet/gambit/sequence.html",
          "spec": "diagrams/gambet/gambit/sequence.json",
          "description": "Passagem de controle dos Fluxos para o Gambit. Webhook com horário de início, histórico recuperado via Zendesk e desfecho por tag (deflexão ou transferência).",
          "dot": "cyan",
          "paths": [
            {
              "id": "client~flows",
              "label": "Cliente → Fluxos"
            },
            {
              "id": "flows~gambit",
              "label": "Fluxos → Gambit (passagem)"
            },
            {
              "id": "gambit~zendesk",
              "label": "Gambit → Zendesk (API)"
            },
            {
              "id": "client~zendesk",
              "label": "Cliente → Zendesk (mensagem)"
            },
            {
              "id": "zendesk~agent",
              "label": "Zendesk → Atendimento humano"
            }
          ],
          "lens": [
            "external",
            "cloud"
          ]
        },
        "architecture": {
          "file": "diagrams/gambet/gambit/architecture.html",
          "spec": "diagrams/gambet/gambit/architecture.json",
          "description": "Gambit (IA com contexto Onfly) atende pelo Zendesk: recupera histórico, intermedeia a conversa e devolve o controle com tag de deflexão ou transferência.",
          "dot": "cyan",
          "paths": [
            {
              "id": "client~flows",
              "label": "Cliente → Fluxos"
            },
            {
              "id": "flows~gambit",
              "label": "Fluxos → Gambit (passagem)"
            },
            {
              "id": "gambit~zendesk",
              "label": "Gambit → Zendesk (API)"
            },
            {
              "id": "zendesk~gambit",
              "label": "Zendesk → Gambit (webhook)"
            },
            {
              "id": "client~zendesk",
              "label": "Cliente → Zendesk (mensagem)"
            },
            {
              "id": "zendesk~agent",
              "label": "Zendesk → Atendimento humano"
            }
          ],
          "lens": [
            "external",
            "cloud",
            "backend"
          ]
        }
      }
    ]
  },
  {
    "id": "fluxo",
    "label": "Fluxos",
    "items": [
      {
        "id": "passcontrol",
        "title": "PassControl ↔ Gambit",
        "short": "PassControl ↔ Gambit",
        "sequence": {
          "file": "diagrams/fluxo/passcontrol/sequence.html",
          "spec": "diagrams/fluxo/passcontrol/sequence.json",
          "description": "Fluxo fim-a-fim via Sunco Switchboard: identidade no Zendesk, rotas de controle e troca Sunco ↔ Gambit com tags de desfecho.",
          "dot": "slate",
          "paths": [
            {
              "id": "cliente~sunco",
              "label": "Usuário → Sunco (inbound)"
            },
            {
              "id": "sunco~bot",
              "label": "Sunco → Bot (lookup identidade)"
            },
            {
              "id": "bot~passcontrol",
              "label": "Bot → PassControl (Rota B · release)"
            },
            {
              "id": "passcontrol~gambit",
              "label": "PassControl → Gambit (webhook)"
            },
            {
              "id": "gambit~bot",
              "label": "Gambit → Bot (histórico)"
            },
            {
              "id": "cliente~gambit",
              "label": "Usuário → Gambit (via Zendesk)"
            },
            {
              "id": "gambit~passcontrol",
              "label": "Gambit → PassControl (return + tag)"
            },
            {
              "id": "passcontrol~agentws",
              "label": "PassControl → Workspace (tags)"
            },
            {
              "id": "agentws~cliente",
              "label": "Atendente → Usuário"
            }
          ],
          "lens": [
            "external",
            "cloud",
            "backend"
          ]
        },
        "architecture": {
          "file": "diagrams/fluxo/passcontrol/architecture.html",
          "spec": "diagrams/fluxo/passcontrol/architecture.json",
          "description": "Componentes do atendimento com PassControl: Sunco Switchboard, Triagem & Bot, PassControl API e Gambit (IA) — com rotas A/B e desfechos por tag.",
          "dot": "rose",
          "paths": [
            {
              "id": "cliente~waba",
              "label": "Usuário → WhatsApp Business API"
            },
            {
              "id": "waba~sunco",
              "label": "WABA → Sunco (webhook · phone)"
            },
            {
              "id": "sunco~bot",
              "label": "Sunco → Bot (lookup · controle)"
            },
            {
              "id": "bot~agentws",
              "label": "Bot → Workspace (Rota A · transferência)"
            },
            {
              "id": "bot~passcontrol",
              "label": "Bot → PassControl (Rota B · release)"
            },
            {
              "id": "passcontrol~sunco",
              "label": "PassControl → Sunco (switchboard)"
            },
            {
              "id": "passcontrol~gambit",
              "label": "PassControl → Gambit (webhook)"
            },
            {
              "id": "gambit~bot",
              "label": "Gambit → Bot (histórico · API)"
            },
            {
              "id": "gambit~passcontrol",
              "label": "Gambit → PassControl (return + tag)"
            },
            {
              "id": "bot~ticket",
              "label": "Bot → Ticket (deflexão · encerra)"
            }
          ],
          "lens": [
            "external",
            "cloud",
            "backend",
            "database"
          ]
        }
      }
    ]
  }
];
