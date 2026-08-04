import React from 'react';
import { BRAND } from '@/config/brand';
import { CAPSULE_TILTED_VIEWBOX, BrandCapsule } from '@/components/Logo';

/**
 * O wordmark foi desenhado nesta pilha, no peso 700 — que a Plus Jakarta Sans
 * e a DM Sans do site não cobrem com o mesmo desenho. Fixamos aqui para o logo
 * sair igual em qualquer página.
 */
const STACK =
  "'Avenir Next', Avenir, Futura, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/**
 * Assinatura da marca: a cápsula-curativo inclinada à esquerda do nome "aviDoc".
 *
 * A cápsula é partida na cintura — cobalto na primeira metade, jade na segunda —
 * e a sílaba "Doc" repete o jade. As duas cores se correspondem: a metade verde
 * da forma e a sílaba verde do nome, de modo que o símbolo explica a palavra em
 * vez de só acompanhá-la.
 *
 * - `size` é o corpo da fonte em px; todo o resto é proporcional.
 * - `dark` inverte para fundo escuro: nome em branco, cores clareadas. O jade
 *   some no escuro, então a metade de acento vira menta clara.
 * - `accent={false}` mantém a cápsula partida mas escreve o nome inteiro em
 *   tinta. É a versão de rodapé e de documento: nada no texto depende da cor
 *   para ser lido, o que a torna segura em impressão de uma cor e em corpo
 *   pequeno.
 *
 * Tamanho mínimo: 14 px. Abaixo disso a cintura fecha — use o <Logo />.
 */
const Wordmark = ({ size = 22, ink = '#151a20', dark = false, accent = true, className = '' }) => {
  const corCapsula = dark ? '#9FB4DE' : BRAND.color;
  const corAcento = dark ? BRAND.acentoClaro : BRAND.acento;
  const corNome = dark ? '#ffffff' : ink;
  const corDoc = accent ? corAcento : corNome;

  const svgH = size * 1.15;
  const svgW = (svgH * 113) / 80;

  return (
    // `inline-flex` vai na classe, não no style, para o chamador conseguir
    // escondê-lo com `hidden sm:inline-flex`.
    <span
      className={`inline-flex ${className}`}
      role="img"
      aria-label={BRAND.name}
      style={{
        fontFamily: STACK,
        alignItems: 'center',
        gap: size * 0.28,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <svg
        viewBox={CAPSULE_TILTED_VIEWBOX}
        width={svgW}
        height={svgH}
        style={{ display: 'block', flex: 'none' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <BrandCapsule color={corCapsula} colorFim={corAcento} />
      </svg>

      <span
        style={{
          fontSize: size,
          fontWeight: 700,
          letterSpacing: '-0.025em',
          color: corNome,
          lineHeight: 1,
        }}
      >
        avi<span style={{ color: corDoc }}>Doc</span>
      </span>
    </span>
  );
};

export default Wordmark;
