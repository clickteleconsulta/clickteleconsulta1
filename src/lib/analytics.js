// Analytics de captação — GA4 + Meta Pixel, carregados APENAS após consentimento (LGPD).
// Os IDs vêm de variáveis de ambiente; sem elas, tudo vira no-op (seguro para deploy).
//   VITE_GA4_ID        -> ex.: G-XXXXXXXXXX
//   VITE_META_PIXEL_ID -> ex.: 1234567890

const GA4_ID = import.meta.env.VITE_GA4_ID;
const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID;
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

export const trackPageView = (path) => {
  if (GA4_ID) gaEvent('page_view', { page_path: path });
  fbEvent('PageView');
};

// ---- Eventos do funil de captação ----
export const trackSignup = (role = 'paciente') => {
  gaEvent('sign_up', { method: 'email', role });
  fbEvent('CompleteRegistration', { content_name: role });
};

export const trackBooking = ({ value, medico, especialidade } = {}) => {
  gaEvent('begin_checkout', { value, currency: 'BRL', items: [{ item_name: especialidade || 'Teleconsulta', item_brand: medico }] });
  fbEvent('InitiateCheckout', { value, currency: 'BRL' });
};

export const trackPurchase = ({ value, transactionId } = {}) => {
  gaEvent('purchase', { value, currency: 'BRL', transaction_id: transactionId });
  fbEvent('Purchase', { value, currency: 'BRL' });
};
