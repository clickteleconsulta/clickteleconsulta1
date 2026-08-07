// NENHUMA COLUNA DE PREÇO AQUI, DE PROPÓSITO.
// `medicos` tem três resquícios de preço — preco, price_in_cents e
// consulta_preco — de quando o valor morava no cadastro do médico. Hoje o preço
// vem de `procedimentos.preco` com a taxa por cima (src/lib/price.js), e as três
// colunas guardaram números velhos até agosto de 2026 — num cadastro de 2025,
// R$ 129,00 contra R$ 65,00 de preço praticado. Foram zeradas pelo
// supabase/sql/preco-legado-medicos.sql; se você for procurar o valor no banco
// hoje, não vai achar. Enquanto elas viajavam junto na consulta, bastava alguém
// escrever `doctor.price_in_cents` para o site cobrar o valor errado — e foi
// exatamente o que aconteceu na grade de horários do perfil público.
// Não devolva nenhuma das três a esta lista.
//
// Colunas PÚBLICAS seguras da tabela `medicos` — usadas nas consultas anônimas
// (agendamentos, perfil público). NÃO inclui dados sensíveis (dados bancários /
// withdrawal_*, token, telefone privado, documentos, assinatura), que ficam
// restritos por column-grant no banco para o papel anon.
export const PUBLIC_DOCTOR_COLUMNS = [
  'id', 'user_id', 'name', 'public_name', 'nome', 'specialty', 'especialidade',
  'crm', 'crm_number', 'crm_uf', 'uf', 'image_url', 'clinic_logo_url',
  'bio', 'description', 'payment_settings',
  'status', 'is_public', 'is_active', 'sexo', 'formacao', 'principal',
  'display_duration', 'slot_duration', 'interval_between', 'max_per_day',
  'accept_new_patients', 'available_for_new_patients', 'espelhar_google',
  'google_appt_public_url', 'doctoralia_reviews_url', 'agenda_fonte', 'agenda_padrao',
  'instructions', 'created_at', 'updated_at',
].join(', ');
