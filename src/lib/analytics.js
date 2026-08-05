// Analytics de captação — GA4 + Meta Pixel + TikTok Pixel, carregados APENAS
// após consentimento (LGPD). Os IDs vêm de variáveis de ambiente; sem elas, tudo
// vira no-op (seguro para deploy).
//   VITE_GA4_ID          -> ex.: G-XXXXXXXXXX
//   VITE_META_PIXEL_ID   -> ex.: 1234567890
//   VITE_TIKTOK_PIXEL_ID -> ex.: CXXXXXXXXXXXXXXXXXXX
//
// ATENÇÃO AO ADICIONAR REDE NOVA: o domínio do script precisa entrar no
// `script-src` da CSP em index.html, senão o navegador bloqueia sem avisar
// ninguém — o painel da rede simplesmente fica zerado e parece que não há
// tráfego. Já derrubou coisa neste projeto.
//
// O QUE ESTE ARQUIVO NÃO FAZ: contar a COMPRA de forma confiável. O pagamento
// acontece fora do site (checkout do Asaas) e o Pix pode ser pago horas depois,
// de outro aparelho — nesses casos o navegador nunca volta para disparar o
// evento. A compra de verdade é reportada pelo servidor, no asaas-webhook, a
// partir da origem gravada no agendamento. O que sai daqui é topo de funil.

const GA4_ID = import.meta.env.VITE_GA4_ID;
const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID;
const TIKTOK_PIXEL_ID = import.meta.env.VITE_TIKTOK_PIXEL_ID;
export const CONSENT_KEY = 'cc_consent_v1'; // 'accepted' | 'rejected'

let initialized = false;

export const getConsent = () => {
  try { return localStorage.getItem(CONSENT_KEY); } catch { return null; }
};

export const setConsent = (value) => {
  try { localStorage.setItem(CONSENT_KEY, value); } catch { /* storage indisponível */ }
};

const hasConsent = () => getConsent() === 'accepted';

// Carrega os scripts de GA4 e Meta Pixel (idempotente). Só roda com consentimento.
export const initAnalytics = () => {
  if (initialized || typeof window === 'undefined' || !hasConsent()) return;
  initialized = true;

  // ---- Google Analytics 4 ----
  if (GA4_ID) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID, { anonymize_ip: true });
  }

  // ---- Meta Pixel ----
  if (PIXEL_ID) {
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  // ---- TikTok Pixel ----
  if (TIKTOK_PIXEL_ID) {
    /* eslint-disable */
    !function (w, d, t) {
      w.TiktokAnalyticsObject = t;
      var ttq = w[t] = w[t] || [];
      ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
      ttq.setAndDefer = function (obj, m) { obj[m] = function () { obj.push([m].concat(Array.prototype.slice.call(arguments, 0))); }; };
      for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function (id) { var inst = ttq._i[id] || []; for (var j = 0; j < ttq.methods.length; j++) ttq.setAndDefer(inst, ttq.methods[j]); return inst; };
      ttq.load = function (id, opts) {
        var url = 'https://analytics.tiktok.com/i18n/pixel/events.js';
        ttq._i = ttq._i || {}; ttq._i[id] = []; ttq._i[id]._u = url;
        ttq._t = ttq._t || {}; ttq._t[id] = +new Date();
        ttq._o = ttq._o || {}; ttq._o[id] = opts || {};
        var s = d.createElement('script'); s.type = 'text/javascript'; s.async = true; s.src = url + '?sdkid=' + id + '&lib=' + t;
        var f = d.getElementsByTagName('script')[0]; f.parentNode.insertBefore(s, f);
      };
      ttq.load(TIKTOK_PIXEL_ID);
      ttq.page();
    }(window, document, 'ttq');
    /* eslint-enable */
  }
};

// Evento genérico (GA4). Silencioso sem consentimento/ID.
const gaEvent = (name, params = {}) => {
  if (!hasConsent()) return;
  try { if (window.gtag) window.gtag('event', name, params); } catch { /* ignore */ }
};
const fbEvent = (name, params = {}, standard = true) => {
  if (!hasConsent()) return;
  try { if (window.fbq) window.fbq(standard ? 'track' : 'trackCustom', name, params); } catch { /* ignore */ }
};
const ttEvent = (name, params = {}) => {
  if (!hasConsent()) return;
  try { if (window.ttq) window.ttq.track(name, params); } catch { /* ignore */ }
};

export const trackPageView = (path) => {
  if (GA4_ID) gaEvent('page_view', { page_path: path });
  fbEvent('PageView');
  // O TikTok registra a visita sozinho no `ttq.page()` do carregamento; aqui
  // seria contada em dobro a cada troca de rota.
};

// ---- Eventos do funil de captação ----
export const trackSignup = (role = 'paciente') => {
  gaEvent('sign_up', { method: 'email', role });
  fbEvent('CompleteRegistration', { content_name: role });
  ttEvent('CompleteRegistration', { description: role });
};

export const trackBooking = ({ value, medico, especialidade } = {}) => {
  gaEvent('begin_checkout', { value, currency: 'BRL', items: [{ item_name: especialidade || 'Teleconsulta', item_brand: medico }] });
  fbEvent('InitiateCheckout', { value, currency: 'BRL' });
  ttEvent('InitiateCheckout', { value, currency: 'BRL', content_type: 'product', content_name: especialidade || 'Teleconsulta' });
};

/**
 * ATENÇÃO: esta função SUBNOTIFICA, e por desenho do fluxo, não por bug daqui.
 *
 * Ela só roda se o paciente voltar à página de confirmação depois de pagar. Quem
 * fecha a aba no checkout do Asaas, ou paga o Pix horas depois de outro
 * aparelho, nunca passa por aqui — e a venda não é contada. O Meta e o GA4
 * convivem com isso hoje.
 *
 * A contagem confiável é a do servidor, no asaas-webhook, que sabe o instante
 * exato em que o pagamento virou "pago". O `transactionId` é o mesmo id do
 * agendamento usado lá, de propósito: é ele que permite às redes descartar a
 * duplicata quando os dois caminhos reportam a mesma venda.
 */
export const trackPurchase = ({ value, transactionId } = {}) => {
  gaEvent('purchase', { value, currency: 'BRL', transaction_id: transactionId });
  fbEvent('Purchase', { value, currency: 'BRL' });
  ttEvent('CompletePayment', { value, currency: 'BRL', event_id: transactionId });
};
