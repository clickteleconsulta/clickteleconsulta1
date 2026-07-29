// Adiciona IP + user agent aos aceites legais criados no cadastro. verify_jwt = false
// (o usuário ainda não confirmou o e-mail). Só complementa registros já criados pelo trigger.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });
  let email = "";
  try { email = (await req.json())?.email ?? ""; } catch { /* noop */ }
  if (!email) return new Response(JSON.stringify({ ok: false }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim()
    || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || null;
  const ua = req.headers.get("user-agent") || null;

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/aceites_legais?email=eq.${encodeURIComponent(email)}&ip_address=is.null`,
    {
      method: "PATCH",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ ip_address: ip, user_agent: ua }),
    },
  );
  return new Response(JSON.stringify({ ok: r.ok }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
});
