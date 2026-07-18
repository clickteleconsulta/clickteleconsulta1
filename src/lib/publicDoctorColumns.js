// Colunas PÚBLICAS seguras da tabela `medicos` — usadas nas consultas anônimas
// (agendamentos, perfil público). NÃO inclui dados sensíveis (dados bancários /
// withdrawal_*, token, telefone privado, documentos, assinatura), que ficam
// restritos por column-grant no banco para o papel anon.
export const PUBLIC_DOCTOR_COLUMNS = [
  'id', 'user_id', 'name', 'public_name', 'nome', 'specialty', 'especialidade',
  'crm', 'crm_number', 'crm_uf', 'uf', 'image_url', 'clinic_logo_url',
  'bio', 'description', 'preco', 'price_in_cents', 'consulta_preco', 'payment_settings',
  'status', 'is_public', 'is_active', 'sexo', 'formacao', 'principal',
  'display_duration', 'slot_duration', 'interval_between', 'max_per_day',
  'accept_new_patients', 'available_for_new_patients', 'espelhar_google',
  'google_appt_public_url', 'doctoralia_reviews_url', 'agenda_fonte', 'agenda_padrao',
  'instructions', 'created_at', 'updated_at',
].join(', ');
