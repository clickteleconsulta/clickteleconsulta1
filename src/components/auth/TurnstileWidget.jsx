import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

// Cloudflare Turnstile (anti-bot). Só renderiza se VITE_TURNSTILE_SITE_KEY estiver definida —
// enquanto não estiver, é um no-op (não afeta login/cadastro). A secret fica no Supabase Auth.
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export const TURNSTILE_ENABLED = !!SITE_KEY;

let scriptPromise = null;
function loadTurnstile() {
  if (typeof window === 'undefined') return Promise.reject(new Error('sem window'));
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Falha ao carregar Turnstile'));
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

// onVerify recebe o token (string vazia quando expira/erro). Use ref.reset() para renovar.
const TurnstileWidget = forwardRef(({ onVerify, onExpire, theme = 'light' }, ref) => {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const cbRef = useRef({ onVerify, onExpire });
  cbRef.current = { onVerify, onExpire };

  useImperativeHandle(ref, () => ({
    reset() {
      try {
        if (window.turnstile && widgetIdRef.current != null) window.turnstile.reset(widgetIdRef.current);
      } catch (_) { /* noop */ }
    },
  }));

  useEffect(() => {
    if (!SITE_KEY) return undefined;
    let cancelled = false;
    loadTurnstile()
      .then(() => {
        if (cancelled || !containerRef.current || widgetIdRef.current != null || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme,
          callback: (token) => cbRef.current.onVerify?.(token),
          'expired-callback': () => { cbRef.current.onVerify?.(''); cbRef.current.onExpire?.(); },
          'error-callback': () => { cbRef.current.onVerify?.(''); },
        });
      })
      .catch(() => { /* falha ao carregar: não bloqueia a tela */ });
    return () => {
      cancelled = true;
      try {
        if (window.turnstile && widgetIdRef.current != null) window.turnstile.remove(widgetIdRef.current);
      } catch (_) { /* noop */ }
      widgetIdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  if (!SITE_KEY) return null;
  return <div ref={containerRef} className="flex justify-center my-1" />;
});

TurnstileWidget.displayName = 'TurnstileWidget';
export default TurnstileWidget;
