// Camufla URLs de storage do Supabase por trás do próprio domínio do site.
// URLs públicas: https://<ref>.supabase.co/storage/v1/object/public/<path>  ->  /cdn/<path>
// (o proxy está configurado em vercel.json). Assim o domínio do projeto Supabase
// não aparece nos links exibidos ao usuário.

const PUBLIC_RE = /\/storage\/v1\/object\/public\/(.+)$/;

export const toSiteUrl = (url) => {
    if (!url || typeof url !== 'string') return url;
    const m = url.match(PUBLIC_RE);
    if (!m) return url;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/cdn/${m[1]}`;
};
