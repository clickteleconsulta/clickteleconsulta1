import React from 'react';
import { BRAND } from '@/config/brand';
import { BrandCross } from '@/components/Logo';

/**
 * A fonte do logo é a Gabarito, e só o logo a usa.
 *
 * Duas correções empilhadas aqui, em ordem cronológica:
 *
 * 1. Esta pilha já começou por `'Avenir Next', Avenir, Futura` — fontes
 *    proprietárias que só existem no macOS e no iOS. Em Windows e Android o
 *    navegador caía para Segoe UI ou Roboto, então **a marca aparecia com um
 *    desenho diferente conforme o aparelho do visitante**, o oposto de uma
 *    assinatura.
 *
 * 2. A correção foi passar tudo para a Geist, servida por nós — o que resolveu
 *    a consistência mas criou outro problema: o logo virou a mesma letra do
 *    texto ao lado, em corpo maior. Marca nenhuma se distingue assim.
 *
 * A Gabarito resolve os dois ao mesmo tempo: é nossa (servida do domínio, logo
 * idêntica em qualquer aparelho) e é diferente do resto do site. O fallback
 * continua sendo a Geist, para que uma falha de carga degrade para a letra do
 * produto e não para a do sistema operacional.
 *
 * O arquivo tem só os seis glifos de "aviDoc" — ver o comentário no index.css
 * antes de escrever qualquer outra palavra nesta fonte.
 */
const STACK = "'Gabarito', 'Geist', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

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
        // Sem `gap`: com a cruz no fim, `avi` e `Doc` voltaram a ser uma palavra
        // só. Um gap entre eles leria "avi Doc", que não é o nome da marca.
        lineHeight: 1,
        whiteSpace: 'nowrap',
        fontSize: size,
        fontWeight: 700,
        letterSpacing: '-0.025em',
      }}
    >
      <span style={{ color: corNome }}>avi</span>
      <span style={{ color: corDoc }}>Doc</span>
      {/* A cruz saiu do meio e virou selo depois do nome.
          No meio ela era articulação: separava as duas sílabas e justificava o
          `Doc` receber o cobalto. No fim ela é assinatura — fecha a marca em vez
          de dividi-la. A divisão de cor continua valendo, agora por hierarquia
          (a sílaba que nomeia o serviço é a que recebe a cor institucional) e
          não por causa de um separador.

          0,72 do corpo, não os 0,52 de quando ficava no meio: entre as sílabas
          ela competia com as letras e precisava ceder; sozinha no fim, precisa
          ter presença de selo, perto da altura de maiúscula do `D`. */}
      {/* A folga vai no invólucro porque o <BrandCross> aceita `className` mas
          não `style`, e esta margem é proporcional ao `size` — não cabe numa
          classe fixa do Tailwind. */}
      <span style={{ display: 'inline-flex', marginLeft: size * 0.16 }}>
        <BrandCross size={Math.round(size * 0.72)} color={corCruz} />
      </span>
    </span>
  );
};

export default Wordmark;
