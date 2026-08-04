import React, { useId } from 'react';
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
 * A cintura da cápsula cai exatamente na metade da forma — x = 52 de 104. Por
 * isso o degradê de parada dura em 50% corta bem na dobra, sem inventar uma
 * divisão que o desenho não tivesse. É o que separa as duas cores da marca.
 */
export const CAPSULE_SPLIT = '50%';

/** A caixa que comporta a forma já rotacionada, sem cortes. */
export const CAPSULE_TILTED_VIEWBOX = '0 0 113 80';

/**
 * A cápsula inclinada, pronta para compor. Desenha dentro do
 * CAPSULE_TILTED_VIEWBOX.
 *
 * Recebe as duas cores; passe a mesma nas duas para obter a versão de uma cor
 * só (documento em preto e branco, gravação, carimbo).
 */
export const BrandCapsule = ({ color = BRAND.color, colorFim = BRAND.acento }) => {
  // Um id por instância: sem isso, dois logos na mesma página compartilham o
  // degradê e o segundo herda as cores do primeiro.
  const id = `cap-${useId().replace(/:/g, '')}`;
  const partido = color !== colorFim;

  return (
    <>
      {partido && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <stop offset={CAPSULE_SPLIT} stopColor={color} />
            <stop offset={CAPSULE_SPLIT} stopColor={colorFim} />
          </linearGradient>
        </defs>
      )}
      <g transform={`rotate(${CAPSULE_ANGLE} 56.5 40) translate(4.5 18)`}>
        <path d={CAPSULE_PATH} fill={partido ? `url(#${id})` : color} />
      </g>
    </>
  );
};

/**
 * Ícone da marca — a cápsula inclinada dentro de um contêiner na cor da marca.
 * Use onde o espaço é quadrado (avatar, notificação, crachá, favicon).
 * Para assinar uma página, prefira o <Wordmark />.
 *
 * Sobre o cobalto, o jade escureceria demais para ser visto: a metade de acento
 * usa a menta clara, a mesma que o wordmark usa em fundo escuro.
 */
const Logo = ({ className = 'w-10 h-10', shape = 'square', variant = 'default' }) => {
  const id = `ico-${useId().replace(/:/g, '')}`;
  const invertido = variant === 'invertido';

  const fundo = invertido ? '#ffffff' : BRAND.color;
  const forma = invertido ? BRAND.color : '#ffffff';
  const formaFim = invertido ? BRAND.acento : BRAND.acentoClaro;

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label={BRAND.name}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset={CAPSULE_SPLIT} stopColor={forma} />
          <stop offset={CAPSULE_SPLIT} stopColor={formaFim} />
        </linearGradient>
      </defs>

      {shape === 'circle' ? (
        <circle cx="32" cy="32" r="30" fill={fundo} />
      ) : (
        <rect x="2" y="2" width="60" height="60" rx="17" fill={fundo} />
      )}

      <g transform={`rotate(${CAPSULE_ANGLE} 32 32) translate(32 32) scale(0.385) translate(-52 -22)`}>
        <path d={CAPSULE_PATH} fill={`url(#${id})`} />
      </g>
    </svg>
  );
};

export default Logo;
