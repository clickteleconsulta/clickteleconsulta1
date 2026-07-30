// Publicador automático de Instagram + Facebook (Meta Graph API). verify_jwt=false;
// protegido por header x-social-token = SOCIAL_TOKEN. Chamado pelo pg_cron.
// Gated: se META_ACCESS_TOKEN / IG_USER_ID / FB_PAGE_ID não estiverem definidos, não faz nada.
// Lê a fila public.social_posts (status='agendado', scheduled_at<=now) e publica. Só fetch nativo.

const GRAPH = "https://graph.facebook.com/v21.0";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SOCIAL_TOKEN = Deno.env.get("SOCIAL_TOKEN") ?? "";
const META_TOKEN = Deno.env.get("META_ACCESS_TOKEN") ?? "";
const IG_USER_ID = Deno.env.get("IG_USER_ID") ?? "";
const FB_PAGE_ID = Deno.env.get("FB_PAGE_ID") ?? "";

const svc = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
function json(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } }); }

async function restGet(q: string) { const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: svc }); return r.ok ? await r.json() : []; }
async function patch(id: string, p: Record<string, unknown>) {
  await fetch(`${SUPABASE_URL}/rest/v1/social_posts?id=eq.${id}`, {
    method: "PATCH", headers: { ...svc, Prefer: "return=minimal" }, body: JSON.stringify(p),
  }).catch(() => {});
}
async function graph(path: string, params: Record<string, string>) {
  const body = new URLSearchParams({ ...params, access_token: META_TOKEN });
  const r = await fetch(`${GRAPH}/${path}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error?.message || `Graph ${r.status}`);
  return data;
}

async function publishInstagram(imageUrl: string, caption: string, tipo: string) {
  const createParams: Record<string, string> = { image_url: imageUrl };
  if (tipo === "story") createParams.media_type = "STORIES";
  else if (caption) createParams.caption = caption;
  const created = await graph(`${IG_USER_ID}/media`, createParams);
  const pub = await graph(`${IG_USER_ID}/media_publish`, { creation_id: String(created.id) });
  return String(pub.id);
}
async function publishFacebook(imageUrl: string, caption: string) {
  const res = await graph(`${FB_PAGE_ID}/photos`, { url: imageUrl, caption: caption || "" });
  return String(res.post_id || res.id);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!SOCIAL_TOKEN || req.headers.get("x-social-token") !== SOCIAL_TOKEN) return json({ error: "unauthorized" }, 401);
  if (!META_TOKEN || !IG_USER_ID || !FB_PAGE_ID) return json({ skipped: "Meta não configurada (defina META_ACCESS_TOKEN, IG_USER_ID, FB_PAGE_ID)" });

  const nowIso = new Date().toISOString();
  const posts = await restGet(
    `social_posts?status=eq.agendado&scheduled_at=lte.${encodeURIComponent(nowIso)}&order=scheduled_at.asc&limit=5` +
    `&select=id,plataforma,tipo,image_url,caption,tentativas`,
  );
  if (!Array.isArray(posts) || posts.length === 0) return json({ ok: true, publicados: 0 });

  const out = { ok: true, publicados: 0, erros: 0, detalhes: [] as unknown[] };
  for (const p of posts) {
    try {
      let igId: string | null = null, fbId: string | null = null;
      if (p.plataforma === "instagram" || p.plataforma === "ambos") {
        igId = await publishInstagram(p.image_url, p.caption || "", p.tipo);
      }
      if ((p.plataforma === "facebook" || p.plataforma === "ambos") && p.tipo !== "story") {
        fbId = await publishFacebook(p.image_url, p.caption || "");
      }
      await patch(p.id, { status: "publicado", published_at: new Date().toISOString(), ig_media_id: igId, fb_post_id: fbId, erro: null });
      out.publicados++;
      out.detalhes.push({ id: p.id, ig: igId, fb: fbId });
    } catch (e) {
      const msg = String((e as Error)?.message ?? e);
      await patch(p.id, { status: "erro", erro: msg, tentativas: (Number(p.tentativas) || 0) + 1 });
      out.erros++;
      out.detalhes.push({ id: p.id, erro: msg });
    }
  }
  return json(out);
});
