import { supabase } from '@/lib/customSupabaseClient';

/**
 * Gera um JWT para o JaaS (8x8 Jitsi as a Service) via Edge Function.
 * O segredo nunca sai do servidor.
 *
 * @param {string} roomName   - Room ID (ex: clicktele-<uuid>)
 * @param {string} displayName - Nome exibido na chamada
 * @param {boolean} isModerator - true para médico, false para paciente
 * @returns {Promise<string>} JWT assinado
 */
const fetchJaaSToken = async (roomName, displayName, isModerator = false) => {
  const { data, error } = await supabase.functions.invoke('jaas-token', {
    body: { roomName, displayName, isModerator }
  });

  if (error) throw new Error(`Erro ao gerar token JaaS: ${error.message}`);
  if (!data?.token) throw new Error('Token JaaS não retornado pelo servidor');

  return data.token;
};

/**
 * Gera a URL completa para o JaaS.
 * Formato: https://8x8.vc/<appId>/<roomName>
 *
 * @param {string} appId      - JaaS App ID (vem da env VITE_JAAS_APP_ID)
 * @param {string} roomName   - Room ID
 * @param {string} jwt        - JWT assinado pelo servidor
 * @param {string} displayName - Nome do participante
 * @returns {string} URL completa
 */
export const generateJaaSURL = (appId, roomName, jwt, displayName) => {
  if (!appId || !roomName || !jwt) {
    console.error('generateJaaSURL: parâmetros insuficientes', { appId, roomName, hasJwt: !!jwt });
    return '';
  }

  const encoded = encodeURIComponent(displayName || 'Participante');
  return (
    `https://8x8.vc/${appId}/${roomName}` +
    `?jwt=${jwt}` +
    `#config.prejoinPageEnabled=false` +
    `&config.requireDisplayName=false` +
    `&userInfo.displayName="${encoded}"`
  );
};

/**
 * Retorna headers de autenticação para chamadas à API de telemedicina.
 *
 * @param {object} session - Objeto de sessão do Supabase
 * @returns {object} Headers com Authorization e Content-Type
 */
export const getAuthHeaders = (session) => {
  if (!session?.access_token) {
    console.warn('getAuthHeaders: sessão inválida ou sem access_token');
    return { 'Content-Type': 'application/json' };
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`
  };
};

/**
 * Abre uma sala JaaS em nova aba.
 * Busca o JWT no servidor antes de abrir.
 *
 * @param {string} roomName     - Room ID
 * @param {string} displayName  - Nome exibido
 * @param {boolean} isModerator - true = médico (moderador)
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export const openJitsiRoom = async (roomName, displayName, isModerator = false) => {
  if (!roomName) {
    console.error('openJitsiRoom: roomName ausente');
    return { ok: false, error: 'Room name ausente' };
  }

  const appId = import.meta.env.VITE_JAAS_APP_ID;
  if (!appId) {
    console.error('openJitsiRoom: VITE_JAAS_APP_ID não configurado');
    return { ok: false, error: 'JaaS App ID não configurado' };
  }

  let jwt;
  try {
    jwt = await fetchJaaSToken(roomName, displayName, isModerator);
  } catch (err) {
    console.error('openJitsiRoom: falha ao buscar JWT', err);
    return { ok: false, error: err.message };
  }

  const url = generateJaaSURL(appId, roomName, jwt, displayName);
  if (!url) return { ok: false, error: 'Falha ao gerar URL JaaS' };

  console.log('Abrindo sala JaaS:', { roomName, isModerator, url: url.split('?')[0] });

  const newWindow = window.open(url, '_blank', 'noopener,noreferrer');

  if (newWindow) {
    newWindow.opener = null;
    return { ok: true };
  }

  console.warn('Popup bloqueado para sala JaaS');
  return { ok: false, error: 'Popup bloqueado' };
};

// ---------------------------------------------------------------------------
// MIGRAÇÃO FUTURA: Self-Hosted Jitsi
// Para migrar de JaaS para self-hosted, altere apenas este arquivo:
//   1. generateJaaSURL → use seu domínio em vez de 8x8.vc/<appId>
//   2. fetchJaaSToken  → aponte para sua edge function com seu segredo
//   3. VITE_JAAS_APP_ID → não necessário (remover ou ignorar)
// Os componentes DoctorTelemedicineButton e PatientTelemedicineButton
// não precisam de nenhuma alteração.
// ---------------------------------------------------------------------------
