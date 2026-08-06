// Cartão de compartilhamento (og:image) do perfil público de cada médico.
//
// POR QUE EXISTE
// Quem manda o link do perfil no WhatsApp queria ver o card do médico e um
// convite para agendar. O robô do WhatsApp NÃO executa JavaScript: as tags que
// o react-helmet escreve no perfil nunca chegam até ele. Ele lê só o HTML que
// vem do servidor — que é o que tools/prerender.mjs grava em
// dist/medico/<slug>/index.html. Então a imagem também precisa existir como
// arquivo, gerada aqui, no build.
//
// POR QUE NO BUILD, E NÃO NUMA FUNÇÃO EM TEMPO DE EXECUÇÃO
// Porque a limitação já existe e não é esta: o próprio <head> do perfil só
// aparece depois de um deploy (é o prerender que o escreve). Uma função que
// gerasse a imagem na hora não adiantaria nada enquanto o HTML daquele médico
// não estivesse publicado. Gerar junto mantém tudo no mesmo passo e sem
// servidor a manter. MÉDICO NOVO CONTINUA PRECISANDO DE UM DEPLOY — igual ao
// título e à descrição, que já funcionam assim.
//
// COMO É DESENHADO
// SVG escrito à mão e rasterizado pelo resvg (WebAssembly puro, sem binário
// nativo, o que importa porque isto roda no build da Vercel). Nada de foto de
// banco de imagens: é o mesmo cartão que a pessoa vai encontrar em
// /agendamentos, com os mesmos dados e as mesmas cores.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(__dirname, '..');

// Paleta — espelha tailwind.config.js e src/config/brand.js.
const COBALTO_100 = '#E3EAF6';
const COBALTO_200 = '#C9D6EE';
const COBALTO_400 = '#7893CB';
const COBALTO_600 = '#3B5BA5';
const COBALTO_700 = '#334D8A';
const COBALTO_50 = '#F2F5FB';
const JADE = '#0C9769';        // o acento da marca, e é nele que o preço sai no site
const ARDOSIA_900 = '#0F172A';
const ARDOSIA_600 = '#475569';
const ARDOSIA_500 = '#64748B';
const ARDOSIA_400 = '#94A3B8';
const BORDA = '#E2E8F0';

const L = 1200;
const A = 630;

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Largura aproximada de um texto, para decidir quando encolher o corpo.
// A Geist tem avanço médio de ~0,52 em relação ao corpo no negrito e ~0,50 no
// regular; medi em algumas amostras do próprio site. É estimativa e é o
// bastante: o único uso é evitar que um nome comprido escape do cartão.
const larguraAprox = (texto, corpo, negrito = false) =>
  String(texto).length * corpo * (negrito ? 0.52 : 0.5);

// Reduz o corpo até o texto caber, com um piso — abaixo dele o nome ficaria
// menor que a especialidade e a hierarquia se inverteria.
const corpoQueCabe = (texto, corpoIdeal, largMax, piso, negrito = false) => {
  let c = corpoIdeal;
  while (c > piso && larguraAprox(texto, c, negrito) > largMax) c -= 1;
  return c;
};

/** O glifo de usuário do Uicons, o mesmo que o card do site usa sem foto. */
const GLIFO_USUARIO =
  'M150 150c41 0 75 34 75 75s-34 75-75 75-75-34-75-75 34-75 75-75zm0-15c-58 0-105 47-105 105 0 8 6 15 15 15h180c8 0 15-7 15-15 0-58-47-105-105-105z';

function avatar(cx, cy, r, fotoDataUri) {
  if (fotoDataUri) {
    return `
    <defs><clipPath id="foto"><circle cx="${cx}" cy="${cy}" r="${r}" /></clipPath></defs>
    <image href="${fotoDataUri}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}"
           preserveAspectRatio="xMidYMid slice" clip-path="url(#foto)" />
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${BORDA}" stroke-width="3" />`;
  }
  // Sem foto, o mesmo desenho do card: disco cobalto e a silhueta em branco.
  const lado = r * 1.5;
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${COBALTO_400}" />
    <g transform="translate(${cx - lado / 2} ${cy - lado / 2}) scale(${lado / 300})">
      <path d="${GLIFO_USUARIO}" fill="#FFFFFF" />
    </g>`;
}

function montarSvg({ nome, especialidade, crm, preco, fotoDataUri, logoDataUri }) {
  const corpoNome = corpoQueCabe(nome, 46, 560, 32, true);
  const cartaoY = 168;
  const cartaoH = 268;
  const centro = cartaoY + cartaoH / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${A}" viewBox="0 0 ${L} ${A}">
  <defs>
    <pattern id="pontos" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="1" fill="${COBALTO_600}" opacity="0.10" />
    </pattern>
  </defs>

  <rect width="${L}" height="${A}" fill="${COBALTO_100}" />
  <rect width="${L}" height="${A}" fill="url(#pontos)" />

  <image href="${logoDataUri}" x="80" y="56" width="210" height="63" />

  <rect x="80" y="${cartaoY}" width="1040" height="${cartaoH}" rx="16" fill="#FFFFFF" stroke="${BORDA}" stroke-width="2" />

  ${avatar(206, centro, 76, fotoDataUri)}

  <text x="322" y="${centro - 42}" font-family="Geist" font-weight="700" font-size="${corpoNome}" fill="${ARDOSIA_900}">${esc(nome)}</text>
  <text x="322" y="${centro + 2}" font-family="Geist" font-weight="400" font-size="27" fill="${ARDOSIA_500}">${esc(especialidade)}</text>
  ${crm ? `<text x="322" y="${centro + 44}" font-family="Geist" font-weight="700" font-size="25" fill="${COBALTO_700}">${esc(crm)}</text>` : ''}

  <rect x="880" y="${centro - 66}" width="196" height="42" rx="10" fill="${COBALTO_50}" stroke="${COBALTO_200}" stroke-width="2" />
  <text x="978" y="${centro - 37}" text-anchor="middle" font-family="Geist" font-weight="700" font-size="21" fill="${COBALTO_700}">Teleconsulta</text>
  ${preco ? `
  <text x="1076" y="${centro + 8}" text-anchor="end" font-family="Geist" font-weight="400" font-size="17" letter-spacing="2" fill="${ARDOSIA_400}">VALOR DA CONSULTA</text>
  <text x="1076" y="${centro + 58}" text-anchor="end" font-family="Geist" font-weight="700" font-size="44" fill="${JADE}">${esc(preco)}</text>` : ''}

  <text x="80" y="524" font-family="Geist" font-weight="700" font-size="44" fill="${ARDOSIA_900}">Agende sua consulta online</text>
  <text x="80" y="568" font-family="Geist" font-weight="400" font-size="27" fill="${ARDOSIA_600}">Veja os horários disponíveis e agende em minutos, com Pix ou cartão.</text>
</svg>`;
}

async function comoDataUri(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const tipo = (r.headers.get('content-type') || '').split(';')[0];
    // O resvg lê PNG, JPEG e GIF. WebP e AVIF entrariam como retângulo vazio —
    // melhor cair no desenho do avatar do que publicar um buraco branco.
    if (!['image/png', 'image/jpeg', 'image/gif'].includes(tipo)) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    return `data:${tipo};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

/** A URL direta do storage. No build não existe `window`, então o /cdn/ do site não serve. */
function urlDaFoto(imageUrl, supabaseUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  const m = imageUrl.match(/\/storage\/v1\/object\/public\/(.+)$/) || imageUrl.match(/\/cdn\/(.+)$/);
  if (m) return `${supabaseUrl}/storage/v1/object/public/${m[1]}`;
  return imageUrl.startsWith('http') ? imageUrl : null;
}

/**
 * Gera um PNG por médico em dist/og/medico/<slug>.png.
 * Devolve um Map slug -> caminho público, para o prerender apontar o og:image.
 * Nunca lança: cartão é enfeite, deploy não pode cair por causa dele.
 */
export async function gerarCartoesOg(medicos, DIST, supabaseUrl) {
  const mapa = new Map();
  if (!medicos?.length) return mapa;

  let Resvg, initWasm;
  try {
    ({ Resvg, initWasm } = await import('@resvg/resvg-wasm'));
    await initWasm(readFileSync(join(RAIZ, 'node_modules/@resvg/resvg-wasm/index_bg.wasm')));
  } catch (e) {
    console.warn('[og] rasterizador indisponível, cartões não gerados:', e.message);
    return mapa;
  }

  const fontes = [
    readFileSync(join(__dirname, 'fontes/Geist-Regular.ttf')),
    readFileSync(join(__dirname, 'fontes/Geist-Bold.ttf')),
  ];
  const logo = `data:image/png;base64,${readFileSync(join(RAIZ, 'public/marca/logo.png')).toString('base64')}`;

  const saida = join(DIST, 'og', 'medico');
  mkdirSync(saida, { recursive: true });

  for (const m of medicos) {
    try {
      const foto = await comoDataUri(urlDaFoto(m.image_url, supabaseUrl) || '');
      const svg = montarSvg({
        nome: m.nomeExibicao,
        especialidade: m.rotuloEspecialidade,
        crm: m.rotuloCrm,
        preco: m.rotuloPreco,
        fotoDataUri: foto,
        logoDataUri: logo,
      });
      const png = new Resvg(svg, {
        fitTo: { mode: 'width', value: L },
        font: { fontBuffers: fontes, defaultFontFamily: 'Geist', loadSystemFonts: false },
      }).render().asPng();
      writeFileSync(join(saida, `${m.slug}.png`), png);
      mapa.set(m.slug, `/og/medico/${m.slug}.png`);
    } catch (e) {
      console.warn('[og] falhou para', m.slug, e.message);
    }
  }
  console.log(`[og] ${mapa.size} cartões de médico gerados`);
  return mapa;
}
