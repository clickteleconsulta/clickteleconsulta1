// Supabase Edge Function: send-doctor-invite
// Usa o MESMO sistema de e-mail do Supabase Auth (mesmo SMTP dos e-mails de
// confirmação) via admin.inviteUserByEmail. Nenhum provedor externo é necessário.
// SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY são injetados pelo runtime.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Identifica o chamador e confirma que é admin
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Não autenticado" }, 401);

    const { data: perfil } = await userClient
      .from("perfis_usuarios").select("role").eq("id", user.id).maybeSingle();
    if (perfil?.role !== "admin") return json({ error: "Acesso negado" }, 403);

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const redirectTo = String(body?.redirectTo ?? "");
    if (!email) return json({ error: "E-mail obrigatório" }, 400);

    const admin = createClient(url, service);

    // Garante um convite ativo (regra: só convidados criam conta de médico)
    const { data: existing } = await admin
      .from("convites_medico").select("id")
      .eq("email", email).in("status", ["pendente", "enviado"]).maybeSingle();
    if (!existing) {
      await admin.from("convites_medico").insert({ email, invited_by: user.id, status: "pendente" });
    }

    // Envia o convite pelo e-mail nativo do Supabase Auth (mesmo SMTP das confirmações)
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { role: "medico" },
      redirectTo: redirectTo || undefined,
    });
    if (inviteErr) return json({ error: inviteErr.message }, 400);

    await admin.from("convites_medico").update({ status: "enviado" }).eq("email", email).eq("status", "pendente");

    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
