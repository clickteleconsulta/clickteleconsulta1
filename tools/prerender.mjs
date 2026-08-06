// Pré-renderização do <head> por rota. Roda DEPOIS do vite build.
// Gera dist/{rota}/index.html com título/descrição/OG/canonical corretos, para que
// os previews de link (WhatsApp/Facebook) e os robôs vejam o meta certo SEM rodar JS.
// O corpo continua sendo o SPA (hidratado pelo JS). Resiliente: nunca quebra o build.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { register } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Ensina o Node a resolver o atalho `@/` do Vite. Precisa vir ANTES de qualquer
// import de src/ — sem isso, siteContent.js quebra em `@/config/brand` e o blog
// fica sem pré-renderização. Ver tools/alias-loader.mjs.
register('./alias-loader.mjs', import.meta.url);

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
// Marca centralizada — ver src/config/brand.js
const { BRAND } = await import('../src/config/brand.js');
// Regras de negócio importadas, não recopiadas: um cartão que mostrasse preço
// ou tratamento diferente do site seria pior que cartão nenhum.
const { patientPriceFromRepasse } = await import('../src/lib/price.js');
const { formatDoctorDisplayName } = await import('../src/lib/doctorName.js');
const { gerarCartoesOg } = await import('./og-medicos.mjs');
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
  if (r.ogImage) {
    // Absoluta e sem query: o robô do WhatsApp não resolve caminho relativo e
    // ignora a prévia se a imagem não vier de uma URL própria.
    const img = `${BASE}${r.ogImage}`;
    html = setMeta(html, 'property', 'og:image', img);
    html = setMeta(html, 'property', 'og:image:width', '1200');
    html = setMeta(html, 'property', 'og:image:height', '630');
    html = setMeta(html, 'property', 'og:image:alt', r.ogImageAlt || r.title);
    html = setMeta(html, 'name', 'twitter:image', img);
    html = setMeta(html, 'name', 'twitter:card', 'summary_large_image');
  }
  return html;
}

async function loadArticles() {
  try {
    const m = await import('../src/content/siteContent.js');
    const artigos = m.ARTICLES || [];
    // Zero artigos aqui significa blog sem meta para os buscadores. O build segue
    // (nunca quebrar o deploy por causa disso), mas o aviso não pode passar batido
    // no meio do log do Vite — foi assim que ficou meses sem ninguém notar.
    if (!artigos.length) console.warn('[prerender] ATENÇÃO: nenhum artigo encontrado — o blog vai sem meta.');
    return artigos;
  } catch (e) {
    console.warn('[prerender] ATENÇÃO: artigos não carregaram, blog sem meta —', e.message);
    return [];
  }
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
    // Mesmas colunas que o cartão de compartilhamento desenha. `procedimentos`
    // vem junto porque o preço do paciente sai do procedimento PRINCIPAL — a
    // coluna medicos.price_in_cents é legado e está nula na maioria (ver o
    // comentário em AppointmentsPage.jsx).
    const cols = 'id,public_name,name,specialty,sexo,crm,uf,image_url,payment_settings,procedimentos(principal,preco)';
    const res = await fetch(`${url}/rest/v1/medicos?select=${cols}&is_active=eq.true&is_public=eq.true`,
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

  // Uma ficha por médico, com tudo já resolvido: o <head> e o cartão precisam
  // dizer exatamente a mesma coisa, e derivar duas vezes é como eles passam a
  // divergir.
  const fichas = doctors.map((d) => {
    const nome = d.public_name || d.name || 'Médico';
    const esp = d.specialty || '';
    const slug = `${slugify(nome)}-${slugify(esp)}`.replace(/^-|-$/g, '');
    const crmNum = d.crm ? String(d.crm).split('/')[0].trim() : '';
    const principal = (d.procedimentos || []).find((p) => p.principal);
    const preco = principal
      ? patientPriceFromRepasse(Number(principal.preco), d.payment_settings?.platform_fee_percent || 0)
      : 0;
    return {
      ...d,
      slug: slug || d.id,
      caminho: slug ? `/medico/${slug}` : `/medico/${d.id}`,
      nome,
      esp,
      nomeExibicao: formatDoctorDisplayName(d.sexo, nome),
      rotuloEspecialidade: esp && esp.toLowerCase() !== 'médico' ? `Médico · ${esp}` : 'Médico',
      rotuloCrm: crmNum ? `CRM ${crmNum}${d.uf ? '/' + d.uf : ''}` : '',
      // Sem procedimento principal não há preço a mostrar. Melhor o cartão sem
      // o bloco de valor do que um "R$ 0,00" que convida para um agendamento
      // que a página nem oferece.
      rotuloPreco: preco > 0 ? preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '',
    };
  });

  const cartoes = await gerarCartoesOg(
    fichas,
    DIST,
    process.env.VITE_SUPABASE_URL || 'https://fnzvopspcoefzybtmwlg.supabase.co'
  );

  const routes = [
    { path: '/como-funciona', title: `Como funciona a teleconsulta · ${MARCA}`, description: 'Veja como agendar uma teleconsulta em 3 passos: escolha o médico, agende e pague, e seja atendido online. A partir de R$ 40, com Pix ou cartão.' },
    { path: '/quem-somos', title: `Quem somos · ${MARCA}`, description: `Nosso propósito é democratizar o acesso à saúde: para o que pode ser resolvido a distância, agilidade sem deslocamento, sem fila e com preço acessível. A ${MARCA} é um marketplace de agendamentos que conecta pacientes a médicos parceiros.` },
    { path: '/perguntas-frequentes', title: `Perguntas frequentes · ${MARCA}`, description: 'Tire suas dúvidas: como agendar, valores, pagamento, reembolso, receita/atestado e proteção de dados.' },
    { path: '/blog', title: `Blog · ${MARCA} — Saúde e teleconsulta`, description: 'Artigos sobre teleconsulta, saúde online e como aproveitar melhor o atendimento à distância.' },
    { path: '/agendamentos', title: `Agendar Consulta · ${MARCA}`, description: 'Encontre médicos parceiros, veja horários e agende sua teleconsulta online. A partir de R$ 40, com Pix ou cartão.' },
    { path: '/suporte', title: `Suporte · ${MARCA}`, description: `Central de ajuda da ${MARCA}: dúvidas sobre agendamento, pagamento, reembolso e atendimento.` },
    { path: '/legal', title: `Termos e Privacidade · ${MARCA}`, description: `Termos de Serviço e Política de Privacidade (LGPD) da ${MARCA}.` },
    ...articles.map((a) => ({ path: `/blog/${a.slug}`, title: `${a.title} · ${MARCA}`, description: a.description, ogType: 'article' })),
    ...fichas.map((f) => ({
      path: f.caminho,
      title: `${f.nomeExibicao}${f.esp ? ' — ' + f.esp : ''} · ${MARCA}`,
      description: `Agende uma teleconsulta com ${f.nomeExibicao}${f.esp ? ', ' + f.esp : ''}. Veja horários e valores e agende online, com Pix ou cartão, na ${MARCA}.`,
      ogType: 'profile',
      ogImage: cartoes.get(f.slug),
      ogImageAlt: `${f.nomeExibicao} — ${f.rotuloEspecialidade}. Agende sua consulta online na ${MARCA}.`,
    })),
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
