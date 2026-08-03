import React from 'react';
import { BRAND } from '@/config/brand';

/**
 * Cápsula-curativo: pastilha de cantos totalmente arredondados com uma cintura
 * suave no meio, sempre desenhada **inclinada**. A inclinação não é enfeite —
 * é o que faz a forma ler como curativo em vez de pastilha genérica, porque é
 * assim que um curativo aparece na pele.
 *
 * Desenhada num viewBox 104×44 e rotacionada −22° onde é usada. Mantenha essa
 * proporção: a cintura só se percebe enquanto a peça for bem mais larga que alta.
 */
export const CAPSULE_VIEWBOX = '0 0 104 44';
export const CAPSULE_PATH =
  'M22 0 H38 Q52 10 66 0 H82 A22 22 0 0 1 82 44 H66 Q52 34 38 44 H22 A22 22 0 0 1 22 0 Z';

/** Ângulo único da marca. Trocar aqui muda logo, ícone e favicon de uma vez. */
export const CAPSULE_ANGLE = -22;

/**
 * A cápsula inclinada, pronta para compor. Desenha dentro de um viewBox
 * 113×80 — a caixa que comporta a forma já rotacionada, sem cortes.
 */
export const CAPSULE_TILTED_VIEWBOX = '0 0 113 80';
export const BrandCapsule = ({ color = '#ffffff' }) => (
  <g transform={`rotate(${CAPSULE_ANGLE} 56.5 40) translate(4.5 18)`}>
    <path d={CAPSULE_PATH} fill={color} />
  </g>
);

/**
 * Ícone da marca — a cápsula inclinada dentro de um contêiner na cor da marca.
 * Use onde o espaço é quadrado (avatar, notificação, crachá, favicon).
 * Para assinar uma página, prefira o <Wordmark />.
 */
const Logo = ({ className = 'w-10 h-10', shape = 'square', variant = 'default' }) => {
  const invertido = variant === 'invertido';
  const fundo = invertido ? '#ffffff' : BRAND.color;
  const forma = invertido ? BRAND.color : '#ffffff';

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label={BRAND.name}
      xmlns="http://www.w3.org/2000/svg"
    >
      {shape === 'circle' ? (
        <circle cx="32" cy="32" r="30" fill={fundo} />
      ) : (
        <rect x="2" y="2" width="60" height="60" rx="17" fill={fundo} />
      )}
      <g transform={`rotate(${CAPSULE_ANGLE} 32 32) translate(32 32) scale(0.385) translate(-52 -22)`}>
        <path d={CAPSULE_PATH} fill={forma} />
      </g>
    </svg>
  );
};

export default Logo;
