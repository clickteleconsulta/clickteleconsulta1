import React from 'react';
import { BRAND } from '@/config/brand';
import { BrandCross } from '@/components/Logo';

/**
 * O wordmark foi desenhado nesta pilha, no peso 700 — que a Plus Jakarta Sans
 * e a DM Sans do site não cobrem com o mesmo desenho. Fixamos aqui para o logo
 * sair igual em qualquer página.
 */
const STACK =
  "'Avenir Next', Avenir, Futura, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/**
 * Assinatura da marca: `avi` + cruz + `Doc`.
 *
 * As três partes têm papéis distintos. `avi` fica em tinta, a cruz carrega o
 * verde e `Doc` fica no cobalto — a sílaba que nomeia o que a plataforma faz é
 * a que recebe a cor institucional.
 *
 * A cruz é o único lugar do produto onde o verde da marca aparece. Ela fica a
 * ΔE 11,8 do verde da Doctoralia, o que é pouco; a decisão de manter foi
 * consciente, pelo raciocínio de que, sendo o único verde da marca e cercado
 * pelo cobalto, o contexto separa as duas.
 *
 * - `size` é o corpo da fonte em px; todo o resto é proporcional, inclusive qual
 *   dos dois desenhos da cruz entra (ver Logo.jsx).
 * - `dark` inverte para fundo escuro: o verde escurece demais e clareia, o
 *   cobalto também.
 * - `accent={false}` escreve tudo em tinta, cruz inclusive. É a versão de rodapé
 *   e de documento: nada depende de cor para ser lido, então sobrevive a
 *   impressão de uma cor, carimbo e fotocópia.
 *
 * Tamanho mínimo: 14 px. Abaixo disso use o <Logo />.
 */
const Wordmark = ({ size = 22, ink = '#151a20', dark = false, accent = true, className = '' }) => {
  const corNome = dark ? '#ffffff' : ink;
  const corDoc = accent ? (dark ? '#9FB4DE' : BRAND.color) : corNome;
  const corCruz = accent ? (dark ? BRAND.acentoClaro : BRAND.acento) : corNome;

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
        gap: size * 0.12,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        fontSize: size,
        fontWeight: 700,
        letterSpacing: '-0.025em',
      }}
    >
      <span style={{ color: corNome }}>avi</span>
      <BrandCross size={Math.round(size * 0.52)} color={corCruz} />
      <span style={{ color: corDoc }}>Doc</span>
    </span>
  );
};

export default Wordmark;
