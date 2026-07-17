// Gera public/sitemap.xml no build: rotas públicas estáticas + perfis dos médicos
// ativos (/medico/{slug}), casando o slug canônico do DoctorPublicProfilePage.
// Resiliente: qualquer falha mantém o sitemap atual e NÃO quebra o build.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://clickteleconsulta.online';
// A anon key é pública (vai no bundle do cliente); só é usada como fallback local.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fnzvopspcoefzybtmwlg.supabase.co';
const ANON = process.env.VITE_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuenZvcHNwY29lZnp5YnRtd2xnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3OTU0NjgsImV4cCI6MjA4OTM3MTQ2OH0.mMDj-2NKx88cQz8cCsljKtscG5ayYEYbmISq04wAEOg';

// Mesmo slugify do DoctorPublicProfilePage (para bater com o canonical).
const slugify = (str = '') =>
  str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const STATIC = [
  { loc: '/', priority: '1.0', changefreq: 'daily' },
  { loc: '/agendamentos', priority: '0.9', changefreq: 'daily' },
  { loc: '/suporte', priority: '0.5', changefreq: 'monthly' },
  { loc: '/legal', priority: '0.3', changefreq: 'yearly' },
];

const today = new Date().toISOString().slice(0, 10);
const urlTag = (loc, lastmod, changefreq, priority) =>
  `  <url>\n    <loc>${BASE}${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

async function main() {
  let doctors = [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/medicos?select=id,public_name,name,specialty,updated_at&is_active=eq.true&is_public=eq.true`,
      { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }
    );
    if (res.ok) doctors = await res.json();
    else console.warn('[sitemap] fetch médicos status', res.status);
  } catch (e) {
    console.warn('[sitemap] fetch falhou, mantendo sitemap atual:', e.message);
    return; // não sobrescreve o sitemap existente
  }

  const urls = STATIC.map((s) => urlTag(s.loc, today, s.changefreq, s.priority));
  for (const d of doctors) {
    const slug = `${slugify(d.public_name || d.name || '')}-${slugify(d.specialty || '')}`.replace(/^-|-$/g, '');
    const loc = slug ? `/medico/${slug}` : `/medico/${d.id}`;
    const lastmod = (d.updated_at || '').slice(0, 10) || today;
    urls.push(urlTag(loc, lastmod, 'weekly', '0.8'));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  writeFileSync(join(__dirname, '..', 'public', 'sitemap.xml'), xml, 'utf8');
  console.log(`[sitemap] gerado: ${STATIC.length} rotas + ${doctors.length} médicos`);
}

main().catch((e) => { console.warn('[sitemap] erro:', e.message); process.exit(0); });
