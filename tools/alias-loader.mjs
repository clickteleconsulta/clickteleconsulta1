// Faz o atalho `@/` do Vite funcionar dentro do Node.
//
// Os scripts de build (prerender, sitemap, llms) importam arquivos de src/ para
// não duplicar conteúdo. Só que `@/` é uma invenção do Vite: o Node não conhece,
// e qualquer módulo de src/ que use o atalho falha com ERR_MODULE_NOT_FOUND.
// Foi assim que os artigos do blog pararam de ser pré-renderizados — siteContent.js
// importa `@/config/brand` e o erro era engolido por um catch.
//
// Este é um resolve hook (node:module register). Ele traduz `@/x` para src/x e
// completa a extensão, que o Vite adivinha e o ESM do Node exige.
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

export function resolve(especificador, contexto, proximo) {
  if (especificador.startsWith('@/')) {
    const base = join(SRC, especificador.slice(2));
    // Ordem igual à do resolvedor do Vite: arquivo antes de diretório.
    const tentativas = [base, `${base}.js`, `${base}.mjs`, join(base, 'index.js')];
    for (const caminho of tentativas) {
      if (existsSync(caminho) && !caminho.endsWith('/')) {
        try {
          return proximo(pathToFileURL(caminho).href, contexto);
        } catch {
          // Diretório sem index, por exemplo: segue para a próxima tentativa.
        }
      }
    }
  }
  return proximo(especificador, contexto);
}
