#!/usr/bin/env node
/**
 * sync-diagrams — injeta o modo shell (data-shell) em diagramas Archify que
 * foram entregues com um template anterior ao modo shell.
 *
 * Fonte única: assets/template.html da skill archify. O bloco CSS shell é
 * extraído do template (entre o comentário "Gallery/embed mode keeps" e a
 * regra --archify-nav-reserve do shell) e injetado, junto com o parse do
 * parâmetro ?shell=1, nos HTMLs que não o possuem.
 *
 * Idempotente: marca com id="archify-shell-mode:<hash>" e substitui o bloco
 * se o hash do template mudar. Pula diagramas que já têm o modo nativo.
 *
 * Uso:  node presentation/sync-diagrams.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const rootDir = path.dirname(new URL(import.meta.url).pathname);
const projectRoot = path.resolve(rootDir, "..");
const TEMPLATE = path.join(
  projectRoot,
  ".claude/skills/archify/assets/template.html"
);
const DIAGRAMS = path.join(projectRoot, "diagrams");

const tpl = fs.readFileSync(TEMPLATE, "utf8");

/* ---------- extrai o CSS shell do template ---------- */
const CSS_START = "/* Gallery/embed mode keeps";
const CSS_END =
  'html[data-shell="true"] .diagram-container { --archify-nav-reserve: 0px !important; }';
const cssStart = tpl.indexOf(CSS_START);
const cssEndAnchor = tpl.indexOf(CSS_END);
if (cssStart === -1 || cssEndAnchor === -1) {
  console.error(
    "ERRO: âncoras do CSS shell não encontradas no template — ajuste o sync-diagrams."
  );
  process.exit(1);
}
const shellCss = tpl.slice(cssStart, cssEndAnchor + CSS_END.length);
const hash = crypto.createHash("sha256").update(shellCss).digest("hex").slice(0, 8);

/* ---------- parse do ?shell=1 cedo no head ---------- */
const SHELL_PARAM_SCRIPT =
  '<script>try{if(new URLSearchParams(window.location.search).get(\'shell\')===\'1\'){document.documentElement.setAttribute(\'data-shell\',\'true\');}}catch(_){}</script>';

const STYLE_OPEN = `<style id="archify-shell-mode:${hash}">`;
const STYLE_OPEN_RE = /<style id="archify-shell-mode:[^"]*">[\s\S]*?<\/style>/;

/* ---------- varre diagrams/ (recursivo) ---------- */
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith(".html")) out.push(p);
  }
  return out;
}

let injected = 0;
let updated = 0;
let skipped = 0;

for (const file of walk(DIAGRAMS)) {
  if (file.includes("visual-check")) continue; // sidecars
  let html = fs.readFileSync(file, "utf8");

  // modo shell nativo (template atual)? nada a fazer
  if (html.includes("get('shell') === '1'")) {
    skipped++;
    continue;
  }

  const block = `${SHELL_PARAM_SCRIPT}\n${STYLE_OPEN}\n${shellCss}\n</style>`;

  if (STYLE_OPEN_RE.test(html)) {
    // já injetado: atualiza se hash mudou
    html = html.replace(STYLE_OPEN_RE, block);
    updated++;
  } else if (html.includes("<head>")) {
    html = html.replace("<head>", `<head>\n${block}`);
    injected++;
  } else {
    console.error(`ERRO: sem <head> — ${file}`);
    continue;
  }

  fs.writeFileSync(file, html);
  console.log(`injetado: ${path.relative(projectRoot, file)}`);
}

console.log(
  `\nCSS: ${injected} injetado(s), ${updated} atualizado(s), ${skipped} nativo(s) — hash ${hash}`
);

/* ============================================================
   Fase 2 — i18n: garante meta.locale "pt-BR" nas specs e re-entrega
   os HTMLs quando a spec (ou o HTML) precisa ser atualizada.
   ============================================================ */
const PT_LOCALE = "pt-BR";
const ARCHIFY_BIN = path.join(
  projectRoot,
  ".claude/skills/archify/bin/archify.mjs"
);

function walkJson(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkJson(p));
    else if (entry.name.endsWith(".json")) out.push(p);
  }
  return out;
}

const { spawnSync } = await import("node:child_process");

let localized = 0;
let redelivered = 0;
let upToDate = 0;
let failures = 0;

for (const specPath of walkJson(DIAGRAMS)) {
  if (specPath.includes("visual-check")) continue;
  let spec;
  try {
    spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
  } catch (_) {
    continue; // não é uma spec Archify
  }
  if (!spec.schema_version || !spec.diagram_type) continue; // não é uma spec

  let changed = false;
  if (spec.meta && spec.meta.locale !== PT_LOCALE) {
    spec.meta.locale = PT_LOCALE;
    fs.writeFileSync(specPath, JSON.stringify(spec, null, 2) + "\n");
    changed = true;
    localized++;
  }

  const htmlPath = specPath.replace(/\.json$/, ".html");
  const needsBuild =
    changed ||
    !fs.existsSync(htmlPath) ||
    fs.statSync(htmlPath).mtimeMs < fs.statSync(specPath).mtimeMs;
  if (!needsBuild) {
    upToDate++;
    continue;
  }

  const outHtml = htmlPath;
  const r = spawnSync(
    process.execPath,
    [ARCHIFY_BIN, "deliver", spec.diagram_type, specPath, outHtml, "--quality", "showcase", "--json"],
    { encoding: "utf8" }
  );
  let ok = false;
  try {
    ok = r.status === 0 && JSON.parse(r.stdout).ok === true;
  } catch (_) {}
  if (ok) {
    redelivered++;
    console.log(`re-entregue (pt-BR): ${path.relative(projectRoot, outHtml)}`);
  } else {
    failures++;
    console.error(
      `ERRO ao entregar ${path.relative(projectRoot, specPath)}: ${(r.stderr || r.stdout || "").slice(0, 300)}`
    );
  }
}

console.log(
  `\ni18n: ${localized} spec(s) localizada(s), ${redelivered} re-entrega(s), ${upToDate} em dia, ${failures} erro(s)`
);
