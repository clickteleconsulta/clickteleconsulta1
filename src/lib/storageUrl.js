// Camufla URLs de storage do Supabase por trás do próprio domínio do site.
//   https://<ref>.supabase.co/storage/v1/object/public/<path>  ->  /cdn/<path>
// (o proxy está configurado em vercel.json).
//
// Também **renormaliza URLs já gravadas no banco**: durante a vida do projeto
// alguns caminhos foram salvos como https://<domínio-antigo>/cdn/<path>. Sem
// isso, trocar de domínio quebraria toda foto de médico e PDF já cadastrado.
// Por isso a função aceita os dois formatos e sempre devolve a origem atual.

const PUBLIC_RE = /\/storage\/v1\/object\/public\/(.+)$/;
const CDN_RE = /\/cdn\/(.+)$/;

export const toSiteUrl = (url) => {
    if (!url || typeof url !== 'string') return url;
    const m = url.match(PUBLIC_RE) || url.match(CDN_RE);
    if (!m) return url;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/cdn/${m[1]}`;
};
