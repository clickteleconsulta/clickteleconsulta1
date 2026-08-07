// Roda com: node --test src/
//
// DE ONDE O PREÇO PODE SAIR — e de onde não pode.
//
// A tabela `medicos` guarda três resquícios de preço: preco, price_in_cents e
// consulta_preco. São de quando o valor morava no cadastro do profissional.
// Hoje o preço do paciente sai de `procedimentos.preco` com a taxa por cima
// (src/lib/price.js), e as três colunas ficaram para trás com números velhos —
// num cadastro real, R$ 129,00 contra R$ 65,00 de preço praticado.
//
// Isso já cobrou o valor errado uma vez: a grade de horários do perfil público
// não recebia o preço calculado e caía em `doctor.price_in_cents`. A tela
// mostrava R$ 65,00 e o agendamento saía por R$ 129,00.
//
// O defeito é fácil de reintroduzir e difícil de notar — ninguém confere o
// preço cobrado numa revisão de código. Por isso ele é testado, e não apenas
// comentado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../', import.meta.url));

const arquivos = (dir) =>
  readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return /\.jsx?$/.test(nome) && !nome.endsWith('.test.js') ? [caminho] : [];
  });

const semComentarios = (texto) =>
  texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('nenhuma tela lê preço do cadastro do médico', () => {
  // Só o acesso a um OBJETO de médico. `appt.price_in_cents` e
  // `appointment.price_in_cents` são o instantâneo do agendamento — esses são
  // legítimos, e são exatamente o que a cobrança usa.
  const proibido = /\b(?:doctor|medico|profissional|doc)\??\.(price_in_cents|consulta_preco)\b/;
  const culpados = [];
  for (const arquivo of arquivos(SRC)) {
    const texto = semComentarios(readFileSync(arquivo, 'utf8'));
    const achado = texto.match(proibido);
    if (achado) culpados.push(`${arquivo.replace(SRC, 'src/')}: ${achado[0]}`);
  }
  assert.deepEqual(
    culpados,
    [],
    `Preço lido do cadastro do médico, que é legado:\n  ${culpados.join('\n  ')}\n` +
      'Use o valor calculado por patientPriceFromRepasse a partir do procedimento principal.'
  );
});

test('as colunas de preço legadas não são pedidas ao banco', () => {
  const colunas = readFileSync(join(SRC, 'lib/publicDoctorColumns.js'), 'utf8');
  for (const legada of ['price_in_cents', 'consulta_preco', "'preco'"]) {
    assert.ok(
      !semComentarios(colunas).includes(legada),
      `publicDoctorColumns.js voltou a pedir "${legada}" — coluna legada, com número velho`
    );
  }
});

test('a conta do preço do paciente existe num lugar só', () => {
  // Reimplementar o arredondamento (Math.ceil(x * 2) / 2) parece inofensivo e
  // não é: a cópia costuma sair sem a folga contra erro de ponto flutuante, e
  // aí duas telas mostram preços diferentes para o mesmo médico.
  // Sem espaço nenhum antes de procurar: a conta pode vir quebrada em várias
  // linhas, e uma expressão que tenta atravessar parênteses aninhados não
  // atravessa — foi assim que a primeira versão deste teste deixou passar
  // exatamente a cópia que ele existia para pegar.
  // `Math.ceil`, e não `Math.round`: arredondar para CIMA é o que caracteriza a
  // regra de dinheiro. `Estrelas.jsx` faz `Math.round(nota * 2) / 2` para meia
  // estrela — mesma forma, outro assunto, e não pode ser acusado.
  // O `[^;]` limita a varredura ao mesmo comando, para a expressão não costurar
  // dois trechos distantes do arquivo.
  const ASSINATURAS = [
    { padrao: /Math\.ceil\([^;]{0,200}?\*2\)\/2/, explica: 'arredondamento do preço para cima' },
    { padrao: /\/\(1-[^;]{0,120}?\/100\)/, explica: 'aplicação da taxa sobre o repasse' },
  ];
  const copias = [];
  for (const arquivo of arquivos(SRC)) {
    if (arquivo.endsWith('lib/price.js')) continue;
    const compacto = semComentarios(readFileSync(arquivo, 'utf8')).replace(/\s+/g, '');
    for (const { padrao, explica } of ASSINATURAS) {
      if (padrao.test(compacto)) copias.push(`${arquivo.replace(SRC, 'src/')} (${explica})`);
    }
  }
  assert.deepEqual(
    copias,
    [],
    `A regra de preço foi recopiada em:\n  ${copias.join('\n  ')}\n` +
      'Importe patientPriceFromRepasse de src/lib/price.js.'
  );
});
