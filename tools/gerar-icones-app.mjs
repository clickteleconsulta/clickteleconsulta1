// Ícones do aplicativo instalável (PWA), a partir do mesmo desenho do favicon.
//
// POR QUE UM GERADOR E NÃO ARQUIVOS SOLTOS
// O símbolo já existe em três lugares — <Logo />, favicon.svg e os PNGs de
// marca. Desenhar os ícones à mão criaria um quarto, que envelheceria sozinho
// no dia em que a cruz mudar. Aqui os quatro tamanhos saem do mesmo SVG.
//
// AS DUAS VARIANTES, E POR QUE A DIFERENÇA IMPORTA
//
//   normal      quadrado com cantos arredondados, como o favicon. É o que
//               aparece onde o sistema NÃO recorta o ícone.
//   maskable    cobalto sangrando até a borda e cruz menor. O Android recorta
//               o ícone na forma que o aparelho usa (círculo, gota, quadrado);
//               se o desenho tiver canto arredondado próprio, sobra uma moldura
//               esquisita, e se a cruz for do mesmo tamanho, o recorte come as
//               pontas. A regra da plataforma é manter o conteúdo dentro dos
//               80% centrais.
//
// O ícone do iOS usa a variante maskable pelo mesmo motivo: o iOS aplica a
// própria máscara e não aceita transparência.
//
// Uso:  node tools/gerar-icones-app.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

// A cruz, igual à do favicon.svg. Muda lá, muda aqui — por isso o `escala`
// entra como parâmetro em vez de estar embutido no caminho.
const cruz = (escala, deslocamento) => `
  <g transform="translate(${deslocamento} ${deslocamento}) scale(${escala})" fill="#ffffff">
    <rect x="9.5" y="4" width="5" height="16" rx="2.5"/>
    <rect x="4" y="9.5" width="16" height="5" rx="2.5"/>
    <rect x="10.8" y="0" width="2.4" height="3" rx="1.2" transform="rotate(45 12 12)"/>
    <rect x="10.8" y="21" width="2.4" height="3" rx="1.2" transform="rotate(45 12 12)"/>
    <rect x="10.8" y="0" width="2.4" height="3" rx="1.2" transform="rotate(135 12 12)"/>
    <rect x="10.8" y="21" width="2.4" height="3" rx="1.2" transform="rotate(135 12 12)"/>
  </g>`;

// 64 é o viewBox do favicon; a cruz mede 24 unidades e vive centralizada.
const NORMAL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="17" fill="#3B5BA5"/>
  ${cruz(1.5, 14)}
</svg>`;

// Sem canto arredondado (o sistema arredonda) e cruz a 1,15 em vez de 1,5, o
// que a mantém dentro dos 80% centrais mesmo no recorte circular.
const MASCARAVEL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#3B5BA5"/>
  ${cruz(1.15, 18.2)}
</svg>`;

const SAIDAS = [
  { arquivo: 'icone-192.png', svg: NORMAL, lado: 192 },
  { arquivo: 'icone-512.png', svg: NORMAL, lado: 512 },
  { arquivo: 'icone-mascaravel-512.png', svg: MASCARAVEL, lado: 512 },
  { arquivo: 'apple-touch-icon.png', svg: MASCARAVEL, lado: 180 },
];

const { Resvg, initWasm } = await import('@resvg/resvg-wasm');
await initWasm(readFileSync(join(RAIZ, 'node_modules/@resvg/resvg-wasm/index_bg.wasm')));

const destino = join(RAIZ, 'public', 'app');
mkdirSync(destino, { recursive: true });

for (const { arquivo, svg, lado } of SAIDAS) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: lado } }).render().asPng();
  writeFileSync(join(destino, arquivo), png);
  console.log(`  ${arquivo.padEnd(28)} ${lado}×${lado}  ${Math.round(png.length / 1024)} KB`);
}
