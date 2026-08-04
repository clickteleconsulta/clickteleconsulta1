import React from 'react';
import { BRAND } from '@/config/brand';

/**
 * A cruz da marca, desenhada só com blocos de cantos arredondados num viewBox
 * 24×24. Ela vive entre as duas sílabas do nome — `avi` + cruz + `Doc` — e é
 * também o ícone quadrado da marca.
 *
 * São DOIS desenhos da mesma cruz, e isso não é redundância:
 *
 * - `irradiada` tem quatro raios curtos nas diagonais, cada um com 3 unidades
 *   num glifo de 24 — 1/8 do tamanho.
 * - `macica` é a mesma cruz sem os raios, para quando não há espaço.
 *
 * É o mesmo princípio dos tamanhos ópticos de uma fonte: o desenho muda para o
 * olho continuar vendo a mesma coisa. Use `crossFor(px)` e não escolha na mão.
 */
export const CROSS_VIEWBOX = '0 0 24 24';

/**
 * Abaixo disto os raios deixam de se separar do miolo e a cruz vira mancha.
 *
 * O número saiu de desenhar as duas versões lado a lado de 10 a 28 px: a 12 px
 * os raios somem, a 14 mal se distinguem e a partir de 16 já lêem como quatro
 * pontos distintos ao redor da cruz. 16 é justamente o tamanho da cruz no
 * cabeçalho do site (wordmark de 30 px × 0,52), então o limiar foi posto aqui de
 * propósito: é onde a marca mais aparece, e é onde o desenho característico
 * precisa estar.
 */
export const CROSS_DETAIL_MIN = 16;

export const CROSS_IRRADIADA = (
  <>
    <rect x="9.5" y="4" width="5" height="16" rx="2.5" />
    <rect x="4" y="9.5" width="16" height="5" rx="2.5" />
    <rect x="10.8" y="0" width="2.4" height="3" rx="1.2" transform="rotate(45 12 12)" />
    <rect x="10.8" y="21" width="2.4" height="3" rx="1.2" transform="rotate(45 12 12)" />
    <rect x="10.8" y="0" width="2.4" height="3" rx="1.2" transform="rotate(135 12 12)" />
    <rect x="10.8" y="21" width="2.4" height="3" rx="1.2" transform="rotate(135 12 12)" />
  </>
);

export const CROSS_MACICA = (
  <>
    <rect x="9.5" y="4" width="5" height="16" rx="2.5" />
    <rect x="4" y="9.5" width="16" height="5" rx="2.5" />
  </>
);

/** O desenho certo para o tamanho em que a cruz vai ser exibida, em px. */
export const crossFor = (px) => (px >= CROSS_DETAIL_MIN ? CROSS_IRRADIADA : CROSS_MACICA);

/**
 * A cruz pronta para compor, já no tamanho pedido.
 * `size` é o lado em px — é ele que decide qual dos dois desenhos entra.
 */
export const BrandCross = ({ size = 24, color = BRAND.acento, className = '' }) => (
  <svg
    viewBox={CROSS_VIEWBOX}
    width={size}
    height={size}
    fill={color}
    className={className}
    style={{ display: 'block', flex: 'none' }}
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
  >
    {crossFor(size)}
  </svg>
);

/**
 * Ícone da marca — a cruz dentro de um contêiner na cor institucional.
 * Use onde o espaço é quadrado (avatar, notificação, crachá, favicon).
 * Para assinar uma página, prefira o <Wordmark />.
 *
 * A cruz aqui é **branca**, não verde, e de propósito: cruz verde no Brasil é
 * letreiro de farmácia, e a aviDoc não vende remédio. No wordmark o verde é
 * acento entre duas sílabas e o contexto desfaz a leitura; sozinha num quadrado,
 * a cruz não tem esse contexto. O verde fica no wordmark.
 */
const Logo = ({ className = 'w-10 h-10', shape = 'square', variant = 'default' }) => {
  const invertido = variant === 'invertido';
  const fundo = invertido ? '#ffffff' : BRAND.color;
  const cruz = invertido ? BRAND.color : '#ffffff';

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label={BRAND.name}
      xmlns="http://www.w3.org/2000/svg"
    >
      {shape === 'circle' ? (
        <circle cx="32" cy="32" r="32" fill={fundo} />
      ) : (
        <rect width="64" height="64" rx="17" fill={fundo} />
      )}
      {/* A cruz ocupa 36 dos 64 do contêiner, centrada. Sempre a irradiada:
          o ícone nunca é desenhado abaixo de 20 px de lado, e nesse tamanho o
          glifo interno ainda tem 11 px. */}
      <g transform="translate(14 14) scale(1.5)" fill={cruz}>
        {CROSS_IRRADIADA}
      </g>
    </svg>
  );
};

export default Logo;
