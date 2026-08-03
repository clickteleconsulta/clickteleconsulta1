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
 * A cor vive no símbolo; o nome fica em tinta. Isso mantém o logo legível em
 * qualquer fundo e faz o conjunto pesar equilibrado — o problema da versão
 * anterior, em que a cápsula cobria só a metade direita da palavra.
 *
 * - `size` é o corpo da fonte em px; todo o resto é proporcional.
 * - `dark` inverte para fundo escuro: nome em branco, cápsula clareada.
 *
 * Tamanho mínimo: 14 px. Abaixo disso a cintura fecha — use o <Logo />.
 */
const Wordmark = ({ size = 22, ink = '#151a20', dark = false, className = '' }) => {
  const corCapsula = dark ? '#9FB4DE' : BRAND.color;
  const corNome = dark ? '#ffffff' : ink;
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
        <BrandCapsule color={corCapsula} />
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
        aviDoc
      </span>
    </span>
  );
};

export default Wordmark;
