/* eslint-env serviceworker */
/**
 * Service worker do aviDoc.
 *
 * O QUE ELE FAZ, E O QUE ELE NÃO PODE FAZER
 * Ele existe para o site abrir rápido em conexão ruim e para o aplicativo
 * instalado não mostrar tela de erro quando a rede cai. Só isso. Cache mal
 * feito é pior que cache nenhum: o usuário fica preso numa versão velha do site
 * sem entender por quê, e ninguém percebe porque no navegador de quem
 * desenvolve está tudo certo.
 *
 * AS TRÊS REGRAS, E O MOTIVO DE CADA UMA
 *
 * 1. ARQUIVOS COM HASH NO NOME (/assets/) — cache primeiro, para sempre.
 *    Seguro porque o nome muda a cada build: `index-a1b2c3.js` nunca vira outra
 *    coisa. Deploy novo gera nome novo, e o antigo simplesmente deixa de ser
 *    pedido.
 *
 * 2. IMAGENS E FONTES — cache primeiro. São estáveis e pesam; é o que mais
 *    encurta o segundo acesso.
 *
 * 3. NAVEGAÇÃO (o HTML) — REDE PRIMEIRO, cache só se a rede falhar. Esta é a
 *    regra que evita o desastre: o HTML é reescrito a cada publicação (é ele
 *    que carrega o título, a descrição e o conteúdo pré-renderizado). Servir do
 *    cache primeiro congelaria o site na versão do dia da instalação.
 *
 * E O QUE FICA DE FORA, DE PROPÓSITO: qualquer coisa que não seja do nosso
 * domínio. Chamada ao Supabase, autenticação, pagamento — nada disso passa por
 * aqui. Cachear resposta de API num serviço de saúde é como um paciente ver a
 * consulta de outro, ou a própria consulta de ontem como se fosse a de hoje.
 */

const VERSAO = 'avidoc-v1';
const OFFLINE = '/';

// Só o essencial. Precarregar muita coisa deixa a instalação lenta e enche o
// disco de quem talvez nunca volte.
const ESSENCIAIS = ['/', '/manifest.webmanifest', '/app/icone-192.png'];

const ehEstatico = (url) =>
  url.pathname.startsWith('/assets/') ||
  url.pathname.startsWith('/ilustra/') ||
  url.pathname.startsWith('/marca/') ||
  url.pathname.startsWith('/pagamento/') ||
  url.pathname.startsWith('/app/') ||
  url.pathname.startsWith('/fonts/') ||
  url.pathname === '/favicon.svg';

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(VERSAO).then((c) => c.addAll(ESSENCIAIS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const { request } = evento;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;   // Supabase, Asaas, medição

  // HTML: rede primeiro.
  if (request.mode === 'navigate') {
    evento.respondWith(
      fetch(request)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(VERSAO).then((c) => c.put(request, copia));
          return resposta;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match(OFFLINE)))
    );
    return;
  }

  // Estáticos: cache primeiro.
  if (ehEstatico(url)) {
    evento.respondWith(
      caches.match(request).then(
        (emCache) =>
          emCache ||
          fetch(request).then((resposta) => {
            // `basic` = mesma origem e resposta completa. Sem isso, um 404 ou
            // uma resposta opaca entraria no cache e passaria a ser servida
            // como se fosse o arquivo certo.
            if (resposta.ok && resposta.type === 'basic') {
              const copia = resposta.clone();
              caches.open(VERSAO).then((c) => c.put(request, copia));
            }
            return resposta;
          })
      )
    );
  }
});
