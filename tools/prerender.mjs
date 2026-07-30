// Pré-renderização do <head> por rota. Roda DEPOIS do vite build.
// Gera dist/{rota}/index.html com título/descrição/OG/canonical corretos, para que
// os previews de link (WhatsApp/Facebook) e os robôs vejam o meta certo SEM rodar JS.
// O corpo continua sendo o SPA (hidratado pelo JS). Resiliente: nunca quebra o build.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const BASE = 'https://clickteleconsulta.online';

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function setTitle(html, t) { return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(t)}</title>`); }
function setMeta(html, attr, key, val) {
  const re = new RegExp(`(<meta ${attr}="${key}" content=")[\\s\\S]*?(")`, 'i');
  if (re.test(html)) return html.replace(re, `$1${esc(val)}$2`);
  return html.replace('</head>', `    <meta ${attr}="${key}" content="${esc(val)}" />\n  </head>`);
}
function setCanonical(html, url) {
  const tag = `<link rel="canonical" href="${esc(url)}" />`;
  const re = /<link rel="canonical"[^>]*>/i;
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
}
function apply(html, r) {
  const url = `${BASE}${r.path}`;
  html = setTitle(html, r.title);
  html = setMeta(html, 'name', 'description', r.description);
  html = setMeta(html, 'property', 'og:title', r.title);
  html = setMeta(html, 'property', 'og:description', r.description);
  html = setMeta(html, 'property', 'og:url', url);
  html = setMeta(html, 'property', 'og:type', r.ogType || 'website');
  html = setMeta(html, 'name', 'twitter:title', r.title);
  html = setMeta(html, 'name', 'twitter:description', r.description);
  html = setCanonical(html, url);
  return html;
}

async function loadArticles() {
  try { const m = await import('../src/content/siteContent.js'); return m.ARTICLES || []; }
  catch (e) { console.warn('[prerender] sem artigos:', e.message); return []; }
}

async function main() {
  let base;
  try { base = readFileSync(join(DIST, 'index.html'), 'utf8'); }
  catch (e) { console.warn('[prerender] dist/index.html ausente, pulando:', e.message); return; }

  // Se a verificação do Search Console não foi definida (env), remove o placeholder para não deixar meta inválida.
  if (base.includes('%VITE_GSC_VERIFICATION%')) {
    base = base.replace(/\s*<meta name="google-site-verification" content="%VITE_GSC_VERIFICATION%" \/>/i, '');
    writeFileSync(join(DIST, 'index.html'), base, 'utf8');
  }

  const articles = await loadArticles();
  const routes = [
    { path: '/como-funciona', title: 'Como funciona a teleconsulta · Click Teleconsulta', description: 'Veja como agendar uma teleconsulta em 3 passos: escolha o médico, agende e pague, e seja atendido online. A partir de R$ 40, com Pix ou cartão.' },
    { path: '/perguntas-frequentes', title: 'Perguntas frequentes · Click Teleconsulta', description: 'Tire suas dúvidas: como agendar, valores, pagamento, reembolso, receita/atestado e proteção de dados.' },
    { path: '/blog', title: 'Blog · Click Teleconsulta — Saúde e teleconsulta', description: 'Artigos sobre teleconsulta, saúde online e como aproveitar melhor o atendimento à distância.' },
    { path: '/agendamentos', title: 'Agendar Consulta · Click Teleconsulta', description: 'Encontre médicos parceiros, veja horários e agende sua teleconsulta online. A partir de R$ 40, com Pix ou cartão.' },
    ...articles.map((a) => ({ path: `/blog/${a.slug}`, title: `${a.title} · Click Teleconsulta`, description: a.description, ogType: 'article' })),
  ];

  let n = 0;
  for (const r of routes) {
    try {
      const html = apply(base, r);
      const dir = join(DIST, r.path);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'index.html'), html, 'utf8');
      n++;
    } catch (e) { console.warn('[prerender] falhou', r.path, e.message); }
  }
  console.log(`[prerender] ${n} rotas pré-renderizadas`);
}

main().catch((e) => { console.warn('[prerender] erro:', e.message); process.exit(0); });
