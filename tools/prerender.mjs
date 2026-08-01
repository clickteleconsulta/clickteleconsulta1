// Pré-renderização do <head> por rota. Roda DEPOIS do vite build.
// Gera dist/{rota}/index.html com título/descrição/OG/canonical corretos, para que
// os previews de link (WhatsApp/Facebook) e os robôs vejam o meta certo SEM rodar JS.
// O corpo continua sendo o SPA (hidratado pelo JS). Resiliente: nunca quebra o build.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
// Marca centralizada — ver src/config/brand.js
const { BRAND } = await import('../src/config/brand.js');
const BASE = BRAND.url;
const MARCA = BRAND.name;

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

// Mesmo slug canônico do DoctorPublicProfilePage / sitemap.
const slugify = (str = '') =>
  str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function loadDoctors() {
  const url = process.env.VITE_SUPABASE_URL || 'https://fnzvopspcoefzybtmwlg.supabase.co';
  const anon = process.env.VITE_SUPABASE_ANON_KEY
    || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuenZvcHNwY29lZnp5YnRtd2xnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3OTU0NjgsImV4cCI6MjA4OTM3MTQ2OH0.mMDj-2NKx88cQz8cCsljKtscG5ayYEYbmISq04wAEOg';
  try {
    const res = await fetch(`${url}/rest/v1/medicos?select=id,public_name,name,specialty&is_active=eq.true&is_public=eq.true`,
      { headers: { apikey: anon, Authorization: `Bearer ${anon}` } });
    if (!res.ok) { console.warn('[prerender] fetch médicos status', res.status); return []; }
    return await res.json();
  } catch (e) { console.warn('[prerender] fetch médicos falhou:', e.message); return []; }
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
  const doctors = await loadDoctors();
  const routes = [
    { path: '/como-funciona', title: `Como funciona a teleconsulta · ${MARCA}`, description: 'Veja como agendar uma teleconsulta em 3 passos: escolha o médico, agende e pague, e seja atendido online. A partir de R$ 40, com Pix ou cartão.' },
    { path: '/quem-somos', title: `Quem somos · ${MARCA}`, description: `Nosso propósito é democratizar o acesso à saúde: para o que pode ser resolvido a distância, agilidade sem deslocamento, sem fila e com preço acessível. A ${MARCA} é um marketplace de agendamentos que conecta pacientes a médicos parceiros.` },
    { path: '/perguntas-frequentes', title: `Perguntas frequentes · ${MARCA}`, description: 'Tire suas dúvidas: como agendar, valores, pagamento, reembolso, receita/atestado e proteção de dados.' },
    { path: '/blog', title: `Blog · ${MARCA} — Saúde e teleconsulta`, description: 'Artigos sobre teleconsulta, saúde online e como aproveitar melhor o atendimento à distância.' },
    { path: '/agendamentos', title: `Agendar Consulta · ${MARCA}`, description: 'Encontre médicos parceiros, veja horários e agende sua teleconsulta online. A partir de R$ 40, com Pix ou cartão.' },
    { path: '/suporte', title: `Suporte · ${MARCA}`, description: `Central de ajuda da ${MARCA}: dúvidas sobre agendamento, pagamento, reembolso e atendimento.` },
    { path: '/legal', title: `Termos e Privacidade · ${MARCA}`, description: `Termos de Serviço e Política de Privacidade (LGPD) da ${MARCA}.` },
    ...articles.map((a) => ({ path: `/blog/${a.slug}`, title: `${a.title} · ${MARCA}`, description: a.description, ogType: 'article' })),
    ...doctors.map((d) => {
      const nome = d.public_name || d.name || 'Médico';
      const esp = d.specialty || '';
      const slug = `${slugify(nome)}-${slugify(esp)}`.replace(/^-|-$/g, '');
      return {
        path: slug ? `/medico/${slug}` : `/medico/${d.id}`,
        title: `${nome}${esp ? ' — ' + esp : ''} · ${MARCA}`,
        description: `Agende uma teleconsulta com ${nome}${esp ? ', ' + esp : ''}. Veja horários e valores e agende online, com Pix ou cartão, na ${MARCA}.`,
        ogType: 'profile',
      };
    }),
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
