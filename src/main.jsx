import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import '@/index.css';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { Toaster } from '@/components/ui/toaster';
import { AppointmentsProvider } from '@/contexts/AppointmentsContext';
import { LoaderProvider } from '@/contexts/LoaderContext';
import { ligarCapturaGlobal } from '@/lib/relatarErro';

// Antes de montar: erro durante a montagem também precisa ser visto.
ligarCapturaGlobal();

// SERVICE WORKER — só em produção.
// Em desenvolvimento ele atrapalha: o Vite troca módulos a quente e um worker
// no meio serve a versão anterior, o que faz parecer que a alteração não pegou.
// O registro entra depois do `load` para não disputar banda com o primeiro
// desenho da página.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Falhar aqui não pode afetar o site: sem service worker ele funciona
      // igual, só perde o carregamento rápido no segundo acesso.
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <LoaderProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppointmentsProvider>
            {/* Havia um CartProvider aqui, do modelo de loja que originou o
                projeto. Nenhuma tela chamava useCart(): era um contexto vivo,
                no pacote de entrada, servindo a ninguém. */}
            <App />
            <Toaster />
          </AppointmentsProvider>
        </AuthProvider>
      </BrowserRouter>
    </LoaderProvider>
  </>
);