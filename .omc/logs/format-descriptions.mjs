// Formata as descriptions das etapas (nodes) do sync-zendesk em HTML estruturado.
import fs from "node:fs";

const C = (s) => `<code>${s}</code>`;

const HTML = {
  "user/sync-users": {
    console: `<p>Entrada do command ${C("bigquery:sync-users")} (<code>bin/hyperf.php</code>). Expõe as opções da base:</p>
<ul>
<li>${C("--batch-size")}, ${C("--concurrency")}, ${C("--hours")}, ${C("--resume")}, ${C("--dry-run")}</li>
</ul>`,
    cmd: `<p><strong>Orquestrador do fluxo</strong>: pagina o BigQuery em lotes de <code>100</code>, resolve a organização de cada usuário e coordena o envio ao Zendesk.</p>`,
    base: `<p>${C("AbstractBigQueryLoadCommand")} — <strong>template da carga</strong>: <code>streamQuery</code> (Generator), buffer por lote, <code>Parallel(concurrency)</code>, <code>pollJobStatus</code> do job e <code>reconcileBatchLocal</code>.</p>
<p><strong>Limites de request</strong>:</p>
<ul>
<li>lotes de até <code>100</code> registros por chamada bulk (${C("BIGQUERY_BATCH_SIZE")}, default <code>100</code>, clamp <code>min(100, max(1, x))</code> — teto da API <code>create_many</code> do Zendesk)</li>
<li>concorrência ${C("BQ_USERS_CONCURRENCY")} (default <code>1</code>, override ${C("--concurrency")})</li>
<li>${C("flushBatchesInParallel")} mantém até N coroutine(s) de envio em paralelo</li>
</ul>
<p>${C("ZendeskService")} aplica <code>throttleRequest()</code> antes de cada request; <code>429/5xx/network</code> viram <code>TransientZendeskException</code> com retry em backoff (<code>Coroutine::sleep</code> não-bloqueante).</p>`,
    bqClient: `<p>${C("BigQueryClientService::streamQuery(sql, maxResults)")} — <strong>Generator coroutine-safe</strong> que normaliza cada linha.</p>`,
    bq: `<p>BigQuery (Google Cloud) — <strong>origem</strong> dos usuários alterados no período.</p>`,
    zs: `<p>${C("ZendeskService")} — <code>createOrUpdateManyUsers</code> (bulk, até <code>100</code> por chamada) e <code>pollJobStatus</code> com backoff.</p>
<p>Aplica <code>throttleRequest()</code> antes de cada request; <code>429/5xx/network</code> viram <code>TransientZendeskException</code> com retry em backoff (<code>Coroutine::sleep</code> não-bloqueante).</p>`,
    zendesk: `<p>API bulk do Zendesk (<code>create_or_update_many_users</code>) — aceita até <code>100</code> registros por chamada e devolve <code>job_id</code> consultado por <code>pollJobStatus</code>.</p>`,
    syncLog: `<p>${C("ZendeskUserSyncLog")} — grava <code>status</code>/<code>last_error</code> por usuário; alimenta o <strong>resume</strong> (<code>alwaysResume</code>) e o command de conflito de e-mails (registros <code>status=Failure</code>).</p>`,
  },

  "organization/sync-organizations": {
    console: `<p>Entrada do command ${C("bigquery:sync-organizations")} (<code>bin/hyperf.php</code>), com as opções da base: ${C("--batch-size")}, ${C("--concurrency")}, ${C("--hours")}, ${C("--resume")}…</p>`,
    cmd: `<p>${C("BigQuerySyncOrganizationsCommand")} (extends ${C("AbstractOrganizationBigQueryCommand")}). <strong>Separa registros em create × update</strong> comparando <code>created_at</code>/<code>updated_at</code>; usa <code>loadAlreadySyncedIds()</code> para pular organizations já sincronizadas no dia (${C("ZendeskOrganizationMapping.synced_at")}). ${C("alwaysResume()")} = <code>true</code>.</p>`,
    base: `<p>${C("AbstractBigQueryLoadCommand")} — <strong>template da carga</strong>: <code>streamQuery</code>, buffer por lote, <code>Parallel(concurrency)</code>, <code>pollJobStatus</code> e <code>reconcileBatchLocal</code>.</p>
<p><strong>Limites de request</strong>:</p>
<ul>
<li>lotes de até <code>100</code> por chamada bulk (${C("BIGQUERY_BATCH_SIZE")}, default <code>100</code>, clamp <code>min(100, max(1, x))</code> — teto da API <code>create_many</code> do Zendesk)</li>
<li>concorrência ${C("BQ_ORGS_CONCURRENCY")} (default <code>1</code>, override ${C("--concurrency")})</li>
<li>${C("flushBatchesInParallel")} mantém até N coroutine(s) de envio em paralelo</li>
</ul>
<p>${C("ZendeskService")} aplica <code>throttleRequest()</code> antes de cada request; <code>429/5xx/network</code> viram <code>TransientZendeskException</code> com retry em backoff (<code>Coroutine::sleep</code> não-bloqueante).</p>`,
    bqClient: `<p>${C("BigQueryClientService::streamQuery(sql, maxResults)")} — <strong>Generator coroutine-safe</strong> que normaliza cada linha.</p>`,
    bq: `<p>BigQuery (Google Cloud) — <strong>origem</strong> das organizations alteradas no período.</p>`,
    dedup: `<p>${C("BigQueryDeduplicationService")} (Redis) — <code>shouldPublish()</code>/<code>markPublished()</code> por <code>namespace+external_id</code> com hash do payload; <strong>evita reenvio redundante</strong> ao Zendesk (economiza requests).</p>`,
    zs: `<p>${C("ZendeskService")} — <code>createManyOrganizations</code> (POST) e <code>updateManyOrganizations</code> (PUT), até <code>100</code> por chamada; <code>pollJobStatus</code> com backoff.</p>
<p>Aplica <code>throttleRequest()</code> antes de cada request; <code>429/5xx/network</code> viram <code>TransientZendeskException</code> com retry em backoff (<code>Coroutine::sleep</code> não-bloqueante).</p>`,
    zendesk: `<p>API bulk do Zendesk (<code>organizations create/update many</code>) — até <code>100</code> registros por chamada; devolve <code>job_id</code>.</p>`,
    mapping: `<p>${C("ZendeskOrganizationMapping")} — <strong>resume</strong> (<code>synced_at</code> de hoje) e persistência do <code>zendesk_organization_id</code> retornado (<code>updateLocalMapping</code>).</p>`,
  },

  "email-conflict/email-conflict": {
    console: `<p>Entrada do command ${C("zendesk:sync-conflicting-user-emails")}. Opções:</p>
<ul>
<li>${C("--id")} (external_id)</li>
<li>${C("--case")} (<code>A|B|C|D</code>)</li>
<li>${C("--report")} (<code>.md</code> em <code>runtime/reports</code>)</li>
<li>${C("--dry-run")} da base</li>
</ul>`,
    cmd: `<p>${C("ZendeskSyncConflictingUserEmailCommand")} (extends ${C("AbstractUserBigQueryCommand")}). Seleciona ${C("ZendeskUserSyncLog")} com <code>status=Failure</code> e <code>last_error=UserUpdateError</code>; busca cadastro no Zendesk por <code>external_id</code> e/ou e-mail e <strong>decide o caso</strong>:</p>
<ul>
<li><strong>A</strong> = merge dos dois cadastros (com guarda de segurança)</li>
<li><strong>B</strong> = <code>external_id</code> já existe (atualiza sem merge)</li>
<li><strong>C</strong> = só o e-mail existe (linka <code>external_id</code>)</li>
<li><strong>D</strong> = nada encontrado (falha manual)</li>
</ul>
<p><strong>Sem bulk</strong>: operações user a user (<code>updateUser</code>, <code>updateUserEmail</code>, <code>updateUserNotes</code>, <code>updateUserAfterMergeWithRetry</code>); <code>retryOnTransientEmailConflict</code> para conflito transitório de e-mail.</p>
<p>${C("ZendeskService")} aplica <code>throttleRequest()</code> antes de cada request; <code>429/5xx/network</code> viram <code>TransientZendeskException</code> com retry em backoff (<code>Coroutine::sleep</code> não-bloqueante).</p>`,
    bq: `<p>BigQuery — consulta cruzada por <code>external_id</code> e <code>email</code> para detectar contas em conflito.</p>`,
    zs: `<p>${C("ZendeskService")} — <code>getUserByExternalId</code>/<code>getUserByEmail</code>/<code>findUserIdByEmail</code> (resolução do caso), <code>updateUser</code>, <code>updateUserEmail</code>, <code>updateUserNotes</code>, <code>updateUserAfterMergeWithRetry</code>.</p>
<p>Aplica <code>throttleRequest()</code> antes de cada request; <code>429/5xx/network</code> viram <code>TransientZendeskException</code> com retry em backoff (<code>Coroutine::sleep</code> não-bloqueante).</p>`,
    zendesk: `<p>API do Zendesk (<code>users</code>) — busca e atualização user a user durante a resolução do conflito.</p>`,
    syncLog: `<p>${C("ZendeskUserSyncLog")} — seleciona registros <code>status=Failure</code> e <strong>reclassifica</strong> <code>Failure → success</code> conforme os casos são resolvidos.</p>`,
    mapping: `<p>${C("Local mapping")} — <code>zendesk_user_id</code>: garante rastreabilidade do merge com o registro de origem.</p>`,
  },
};

for (const [dir, dict] of Object.entries(HTML)) {
  const p = `diagrams/sync-zendesk/${dir}.json`;
  const spec = JSON.parse(fs.readFileSync(p, "utf8"));
  let n = 0;
  for (const node of spec.nodes || spec.components || []) {
    const html = dict[node.id];
    if (html) {
      node.description = html;
      n++;
    }
  }
  fs.writeFileSync(p, JSON.stringify(spec, null, 2) + "\n");
  console.log(`${dir}: ${n} description(s) formatada(s)`);
}
