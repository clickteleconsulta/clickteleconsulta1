import React from 'react';
import { Star } from 'lucide-react';

/**
 * As cinco estrelas de uma nota MÉDIA, com meia estrela.
 *
 * Só para média. A nota de uma avaliação isolada é sempre inteira (o paciente
 * clica em 1 a 5), e ali meia estrela não significa nada — nesses lugares
 * continue usando o <Star> direto.
 *
 * Antes o card acendia `i < Math.round(nota)`: 4,2 e 4,8 viravam a mesma coisa
 * na tela (4 e 5 estrelas cheias), e 4,5 subia para 5. Quem lê estrela lê a
 * reputação do médico — arredondar meio ponto para cima é dizer algo que a nota
 * não diz.
 *
 * O preenchimento é quantizado em meias porque é o que o olho consegue
 * comparar entre um card e outro; 4,2 vira 4 e 4,3 vira 4,5.
 *
 * A meia estrela é feita sobrepondo uma estrela âmbar recortada por um
 * contêiner de largura 50% sobre a estrela cinza. Não é uma fonte de ícone com
 * glifo de meia estrela nem um SVG à parte: assim o desenho permanece o mesmo
 * do resto do app, e mudar o ícone muda os dois estados juntos.
 *
 * `aria-hidden` de propósito: quem chama já anuncia a nota em texto no
 * aria-label do link. Repetir aqui faria o leitor de tela ler cinco vezes.
 */
const Estrelas = ({ nota = 0, tamanho = 12, className = '' }) => {
  const emMeias = Math.round(Math.max(0, Math.min(5, Number(nota) || 0)) * 2) / 2;

  return (
    <div className={`flex items-center gap-0.5 ${className}`} aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => {
        const fracao = Math.max(0, Math.min(1, emMeias - i));
        return (
          <span
            key={i}
            className="relative inline-flex shrink-0"
            style={{ width: tamanho, height: tamanho }}
          >
            <Star
              className="absolute inset-0 fill-slate-200 text-slate-200"
              style={{ width: tamanho, height: tamanho }}
            />
            {fracao > 0 && (
              // `overflow-hidden` recorta; a estrela de dentro mantém a largura
              // cheia, senão ela seria espremida em vez de cortada ao meio.
              <span
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${fracao * 100}%` }}
              >
                <Star
                  className="fill-amber-400 text-amber-400"
                  style={{ width: tamanho, height: tamanho }}
                />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
};

export default Estrelas;
