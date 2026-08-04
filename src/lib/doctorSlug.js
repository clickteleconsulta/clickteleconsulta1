/**
 * O endereço público do médico: /medico/<nome>-<especialidade>.
 *
 * Ponto único da regra. Ela estava copiada no DoctorPublicProfilePage (que gera
 * o canonical) e no tools/generate-sitemap.mjs (que gera o sitemap) — duas
 * cópias que precisam concordar para o Google não ver endereços diferentes
 * apontando para a mesma página. Uma terceira cópia entraria no card da
 * listagem; virou este módulo.
 *
 * A rota aceita tanto o slug quanto o UUID, então o slug pode mudar sem quebrar
 * link antigo.
 */
export const slugify = (str = '') =>
  str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** O caminho do perfil. Cai no id quando não há nome para formar slug. */
export const doctorPath = (doctor) => {
  if (!doctor) return '#';
  const slug = `${slugify(doctor.public_name || doctor.name || '')}-${slugify(doctor.specialty || '')}`
    .replace(/^-|-$/g, '');
  return `/medico/${slug || doctor.id}`;
};
