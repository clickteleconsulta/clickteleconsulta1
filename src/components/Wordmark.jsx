import React from 'react';
import { BRAND } from '@/config/brand';
import { BrandCross } from '@/components/Logo';

/**
 * A fonte do logo é a mesma do site inteiro, e isso é uma correção.
 *
 * Antes esta pilha começava por `'Avenir Next', Avenir, Futura` — fontes
 * proprietárias que só existem no macOS e no iOS. Em Windows e Android o
 * navegador caía para Segoe UI ou Roboto, então **a marca aparecia com um
 * desenho diferente conforme o aparelho do visitante**, o oposto de uma
 * assinatura. Com a Geist, que nós mesmos servimos, o logo sai idêntico em
 * qualquer lugar.
 */
const STACK = "'Geist', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

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
 * **A marca é uma só.** Não há versão monocromática nem variante por contexto:
 * as três cores aparecem sempre, do cabeçalho ao rodapé, do PDF ao avatar. A
 * única troca permitida é a de fundo escuro, e ela existe porque o jade some
 * sobre preto — não é uma segunda marca, é a mesma com a luz corrigida.
 *
 * - `size` é o corpo da fonte em px; todo o resto é proporcional, inclusive qual
 *   dos dois desenhos da cruz entra (ver Logo.jsx). Use as constantes de
 *   `TAMANHOS` em vez de números soltos.
 * - `dark` inverte para fundo escuro.
 *
 * Tamanho mínimo: 14 px. Abaixo disso use o <Logo />.
 */

/**
 * A escala da marca. Existir aqui é o que impede cada tela escolher um número
 * diferente e a marca aparecer com sete tamanhos pelo site.
 */
export const TAMANHOS = {
  compacto: 24, // barras de painel, onde o espaço vertical é curto
  padrao: 34,   // cabeçalho e rodapé do site
  destaque: 40, // telas de entrada, manutenção, páginas de assinatura
};

const Wordmark = ({ size = TAMANHOS.padrao, ink = '#151a20', dark = false, className = '' }) => {
  const corNome = dark ? '#ffffff' : ink;
  const corDoc = dark ? '#9FB4DE' : BRAND.color;
  const corCruz = dark ? BRAND.acentoClaro : BRAND.acento;

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
