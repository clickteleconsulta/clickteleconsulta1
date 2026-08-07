// Gera public/llms.txt no build: o resumo que ChatGPT, Perplexity e afins leem
// para entender o que o site é.
//
// Substitui o gerador antigo (tools/generate-llms.js), que varria o `<Helmet>`
// de TODA página em src/pages com expressão regular. Ele produzia lixo por três
// motivos, todos visíveis no arquivo publicado:
//
//   1. `routes.length` num Map — Map não tem `.length`, então a condição era
//      sempre falsa e as URLs reais nunca eram usadas. Saía `/comofunciona`
//      (nome do arquivo) no lugar de `/como-funciona` (rota de verdade).
//   2. Títulos em template literal viravam "`}" — a regex que limpava `{...}`
//      parava no primeiro `}`, que é o de `${BRAND.name}`, e deixava o resto.
//   3. Varria as páginas privadas junto: /doctordashboard, /resetpassword,
//      /handleapplication e /verification foram parar no arquivo público,
//      justamente as que o robots.txt proíbe.
//
// A lista agora é curada, espelhando STATIC do generate-sitemap.mjs, e os
// perfis dos médicos vêm do mesmo lugar que o sitemap. Ao criar uma página
// pública nova, acrescente aqui e lá.
import { writeFileSync } from 'node:fs';
import { precoAPartirDe } from '../src/config/preco.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { BRAND, EMPRESA } from '../src/config/brand.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = BRAND.url;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fnzvopspcoefzybtmwlg.supabase.co';
const ANON = process.env.VITE_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuenZvcHNwY29lZnp5YnRtd2xnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3OTU0NjgsImV4cCI6MjA4OTM3MTQ2OH0.mMDj-2NKx88cQz8cCsljKtscG5ayYEYbmISq04wAEOg';

// Mesmo slugify do DoctorPublicProfilePage e do generate-sitemap.mjs.
const slugify = (str = '') =>
  str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const PAGES = [
  { loc: '/', titulo: 'Início', desc: 'Marketplace de agendamento: escolha o profissional, veja preço e horários e agende em minutos. Pix ou cartão, sem mensalidade.' },
  { loc: '/agendamentos', titulo: 'Agendamentos', desc: 'Encontre profissionais disponíveis, compare preços e horários e agende sua teleconsulta em minutos.' },
  { loc: '/como-funciona', titulo: 'Como funciona', desc: `Como agendar uma teleconsulta em 3 passos: escolha o médico, agende e pague, e seja atendido online. A partir de ${precoAPartirDe}, com Pix ou cartão.` },
  { loc: '/quem-somos', titulo: 'Quem somos', desc: `O propósito de democratizar o acesso à saúde e o que a ${BRAND.name} é — e o que não é — como marketplace de agendamentos.` },
  { loc: '/perguntas-frequentes', titulo: 'Perguntas frequentes', desc: 'Dúvidas sobre como agendar, valores, pagamento, reembolso, receita e atestado, e proteção de dados.' },
  { loc: '/documentos-e-validade', titulo: 'Documentos e validade', desc: 'A validade legal da teleconsulta no Brasil, os documentos que o médico pode emitir (prescrição, pedido de exames e atestado) e como conferir a autenticidade em validar.iti.gov.br.' },
  { loc: '/diretrizes-de-avaliacao', titulo: 'Diretrizes de avaliação', desc: 'Quem pode avaliar um profissional, o que é publicado, como verificamos e o que fazemos com avaliação falsa.' },
  { loc: '/suporte', titulo: 'Suporte', desc: 'Canais de atendimento e ajuda para pacientes e médicos parceiros.' },
  { loc: '/legal', titulo: 'Documentos legais', desc: 'Termos de Serviço e Política de Privacidade em vigor.' },
];

const BLOG = [
  { loc: '/blog', titulo: 'Blog', desc: 'Artigos sobre teleconsulta, saúde online e como aproveitar melhor o atendimento à distância.' },
  { loc: '/blog/como-funciona-a-teleconsulta', titulo: 'Como funciona a teleconsulta', desc: 'O que é uma teleconsulta, como acontece na prática e o que esperar do atendimento.' },
  { loc: '/blog/renovacao-de-receita-por-teleconsulta', titulo: 'Renovação de receita por teleconsulta', desc: 'Quando a receita pode ser renovada a distância e o que o médico avalia antes de prescrever.' },
  { loc: '/blog/teleconsulta-e-confiavel-o-que-diz-o-cfm', titulo: 'Teleconsulta é confiável? O que diz o CFM', desc: 'O que a regulamentação do Conselho Federal de Medicina estabelece sobre o atendimento a distância.' },
];

const item = ({ loc, titulo, desc }) => `- [${titulo}](${BASE}${loc}): ${desc}`;

async function fetchDoctors() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/medicos?select=id,public_name,name,specialty&is_active=eq.true&is_public=eq.true`,
      { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }
    );
    if (res.ok) return await res.json();
    console.warn('[llms] fetch médicos status', res.status);
  } catch (e) {
    console.warn('[llms] fetch falhou:', e.message);
  }
  return null;
}

async function main() {
  const doctors = await fetchDoctors();
  // Sem a lista de médicos o arquivo ficaria incompleto — melhor manter o atual.
  if (doctors === null) {
    console.warn('[llms] mantendo o llms.txt atual');
    return;
  }

  const perfis = doctors.map((d) => {
    const slug = `${slugify(d.public_name || d.name || '')}-${slugify(d.specialty || '')}`.replace(/^-|-$/g, '');
    return `- [${d.public_name || d.name}](${BASE}${slug ? `/medico/${slug}` : `/medico/${d.id}`})`;
  });

  const txt = `# ${BRAND.name}

> Marketplace brasileiro de agendamento de teleconsultas médicas. O paciente escolhe
> o profissional, vê preço e horários e agenda em minutos, pagando com Pix ou cartão,
> sem mensalidade e sem convênio.

A ${BRAND.name} **intermedia o agendamento e o pagamento** entre paciente e médico.
Não é plano de saúde, convênio, cartão de desconto nem plataforma de telemedicina:
a teleconsulta e o ato médico são de responsabilidade exclusiva do profissional,
que realiza o atendimento pelos meios próprios, conforme as normas do CFM.

Operada por ${EMPRESA.razaoSocial} · CNPJ ${EMPRESA.cnpj} · ${EMPRESA.cidadeUf}.
Contato: ${BRAND.emails.contato}

## Pages

${PAGES.map(item).join('\n')}

## Blog

${BLOG.map(item).join('\n')}

## Médicos parceiros

Cada profissional tem uma página pública com registro no CRM, preço, duração e
horários disponíveis. A lista muda conforme o corpo clínico.

${perfis.join('\n')}

## Optional

- [Mapa do site](${BASE}/sitemap.xml): Todas as URLs públicas indexáveis.

As áreas de conta — painel do médico, área do paciente e administração — são
privadas e estão fora de indexação, conforme o robots.txt.
`;

  writeFileSync(join(__dirname, '..', 'public', 'llms.txt'), txt, 'utf8');
  console.log(`[llms] gerado: ${PAGES.length + BLOG.length} páginas + ${doctors.length} médicos`);
}

main().catch((e) => { console.warn('[llms] erro:', e.message); process.exit(0); });
