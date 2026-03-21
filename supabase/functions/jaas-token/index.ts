/**
 * Edge Function: jaas-token
 * Gera um JWT assinado para autenticação no JaaS (8x8 Jitsi as a Service).
 *
 * Secrets necessários (Supabase Dashboard → Settings → Edge Functions → Secrets):
 *   JAAS_APP_ID      - ID da aplicação JaaS (ex: vpaas-magic-cookie-xxxx)
 *   JAAS_PRIVATE_KEY - Chave privada RSA em formato PEM (RSA-256)
 *   JAAS_KEY_ID      - Key ID registrado no JaaS Dashboard
 *
 * Payload enviado pelo cliente:
 *   { roomName: string, displayName: string, isModerator: boolean }
 *
 * Retorno:
 *   { token: string }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

// HOTFIX-07: Restrict CORS to known origins instead of wildcard "*"
const ALLOWED_ORIGINS = [
  'https://clickteleconsulta.online',
  'http://localhost:3000',
  'http://localhost:5173',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const appId      = Deno.env.get("JAAS_APP_ID");
    const privateKey = Deno.env.get("JAAS_PRIVATE_KEY");
    const keyId      = Deno.env.get("JAAS_KEY_ID");

    if (!appId || !privateKey || !keyId) {
      throw new Error("Secrets JaaS não configurados (JAAS_APP_ID, JAAS_PRIVATE_KEY, JAAS_KEY_ID)");
    }

    const { roomName, displayName, isModerator } = await req.json();

    if (!roomName) {
      return new Response(JSON.stringify({ error: "roomName obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Importar chave RSA privada PEM
    const pemBody = privateKey
      .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/, "")
      .replace(/-----END (RSA )?PRIVATE KEY-----/, "")
      .replace(/\s+/g, "");

    const keyBytes = base64Decode(pemBody);

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      keyBytes,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // Gerar UUID único para o participante
    const userId = crypto.randomUUID();
    const now    = getNumericDate(0);
    const exp    = getNumericDate(60 * 60); // 1 hora

    const payload = {
      aud:  "jitsi",
      iss:  "chat",
      iat:  now,
      exp:  exp,
      nbf:  now,
      sub:  appId,
      room: roomName,
      context: {
        user: {
          id:          userId,
          name:        displayName || "Participante",
          moderator:   isModerator ? "true" : "false",
          hidden:      false,
        },
        features: {
          livestreaming: false,
          recording:     false,
          transcription: false,
          outbound_call: false,
        },
      },
    };

    const header = {
      alg: "RS256" as const,
      kid: keyId,
      typ: "JWT",
    };

    const token = await create(header, payload, cryptoKey);

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("jaas-token error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
