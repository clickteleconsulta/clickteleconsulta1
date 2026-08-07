// Dispara as duas mensagens de agendamento para o SEU número, com dados de
// exemplo — sem criar agendamento nenhum no banco.
//
// POR QUE NÃO SIMULAR PELO BANCO
// Dava para inserir um agendamento falso marcado como pago e deixar o webhook
// fazer o resto. Seria um teste mais completo e um estrago maior: agendamento e
// log são imutáveis por decisão de produto, então o registro falso ficaria para
// sempre, contaminando receita, funil e a auditoria. Um teste não pode sujar o
// que ele existe para proteger.
//
// O QUE ESTE TESTE PROVA
//   • o token e o Phone Number ID estão certos;
//   • os modelos foram aprovados e a Meta aceita enviá-los;
//   • a mensagem chega, e você vê exatamente o que o paciente e o médico verão.
//
// O QUE ELE NÃO PROVA
//   • que o webhook do Asaas chama as funções na hora certa.
// Isso só um pagamento de verdade prova, porque o gatilho é o pagamento. Depois
// que este teste passar, faça um agendamento real seu e pague: aí a corrente
// inteira fica verificada.
//
// Uso — as credenciais ficam no SEU ambiente e não passam por aqui:
//
//   export META_WA_TOKEN='...'
//   export META_WA_PHONE_ID='1229716980229241'
//   export DESTINO='33999998888'          # seu celular com DDD, sem o +55
//   node tools/testar-disparo-whatsapp.mjs

const TOKEN = process.env.META_WA_TOKEN;
const PHONE_ID = process.env.META_WA_PHONE_ID;
const DESTINO_BRUTO = process.env.DESTINO ?? '';
const VERSAO = process.env.META_WA_API_VERSION || 'v21.0';
const IDIOMA = 'pt_BR';

if (!TOKEN || !PHONE_ID || !DESTINO_BRUTO) {
  console.error('Faltam META_WA_TOKEN, META_WA_PHONE_ID e/ou DESTINO. Veja o cabeçalho deste arquivo.');
  process.exit(1);
}

/** Mesma normalização da função de produção, para o teste valer como teste. */
const so = DESTINO_BRUTO.replace(/\D/g, '');
const sem55 = so.startsWith('55') ? so.slice(2) : so;
if (!/^[1-9][0-9]9[0-9]{8}$/.test(sem55)) {
  console.error(`DESTINO inválido: "${DESTINO_BRUTO}". Use DDD + 9 dígitos, ex.: 33999998888`);
  process.exit(1);
}
const DESTINO = `55${sem55}`;

// Os mesmos exemplos que foram para a análise da Meta — assim o que você
// recebe é idêntico em forma ao que o paciente vai receber.
const ENVIOS = [
  {
    quem: 'PACIENTE (confirmação)',
    template: 'agendamento_confirmado_paciente',
    variaveis: ['Maria', 'Dr. Ryan de Brito', '12/08/2026', '14:30', 'AVD-2026-0812-0001'],
  },
  {
    quem: 'MÉDICO (novo agendamento)',
    template: 'novo_agendamento_medico',
    variaveis: ['Maria Souza', '12/08/2026', '14:30', 'AVD-2026-0812-0001'],
  },
];

const enviar = async ({ template, variaveis }) => {
  const resp = await fetch(`https://graph.facebook.com/${VERSAO}/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: DESTINO,
      type: 'template',
      template: {
        name: template,
        language: { code: IDIOMA },
        components: [{ type: 'body', parameters: variaveis.map((text) => ({ type: 'text', text })) }],
      },
    }),
  });
  const dados = await resp.json().catch(() => ({}));
  if (resp.ok) return { ok: true, detalhe: dados?.messages?.[0]?.id ?? 'aceito' };
  const erro = dados.error ?? {};
  return { ok: false, detalhe: erro.error_user_msg || erro.message || `HTTP ${resp.status}`, codigo: erro.code };
};

console.log(`Enviando para +${DESTINO} pelo número ${PHONE_ID}…\n`);
let falhou = false;
for (const envio of ENVIOS) {
  const r = await enviar(envio);
  console.log(`  ${r.ok ? '✓' : '✗'} ${envio.quem.padEnd(28)} ${r.detalhe}`);
  if (!r.ok) falhou = true;
}

if (falhou) {
  console.log('\nComo ler o erro acima:\n');
  console.log('  "template name does not exist" / 132001');
  console.log('      O modelo ainda está EM ANÁLISE, ou o nome/idioma não bate.');
  console.log('      Confira em WhatsApp Manager → Modelos: precisa estar Ativo.\n');
  console.log('  "(#131030) recipient not in allowed list"');
  console.log('      A conta ainda está em modo de teste. Cadastre o seu número');
  console.log('      como destinatário permitido no painel do app.\n');
  console.log('  "(#100)" com o Phone Number ID');
  console.log('      Provavelmente é o WABA ID no lugar do Phone Number ID.\n');
  console.log('  190 / "Session has expired"');
  console.log('      Token temporário de 24h. Use o de usuário do sistema.');
} else {
  console.log('\nAs duas saíram. Confira o celular: devem chegar em segundos.');
  console.log('Se chegaram, o caminho até a Meta está inteiro — falta só provar o');
  console.log('gatilho, com um agendamento real pago.');
}
process.exit(falhou ? 1 : 0);
