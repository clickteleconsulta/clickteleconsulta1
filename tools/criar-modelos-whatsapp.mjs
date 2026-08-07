// Cria os três modelos de mensagem do WhatsApp pela API da Meta.
//
// POR QUE UM SCRIPT E NÃO O PAINEL
// São três formulários com regras que reprovam em silêncio: variável no começo
// ou no fim do corpo, duas variáveis coladas, nome com maiúscula. Digitar à mão
// erra; aqui o texto é o mesmo que a função envia, e fica versionado junto com
// ela — quem mudar a mensagem no código vê que existe um modelo para atualizar.
//
// AS CREDENCIAIS NÃO PASSAM POR AQUI
// O script lê duas variáveis do SEU ambiente e não as guarda em lugar nenhum.
// Rode você mesmo, na sua máquina:
//
//   export META_WA_TOKEN='...'      # token de usuário do sistema, permanente
//   export META_WABA_ID='...'       # ID da conta comercial (não é o do número)
//   node tools/criar-modelos-whatsapp.mjs
//
// Onde achar os dois: WhatsApp Manager → Configurações da conta. O WABA ID é o
// da CONTA; o META_WA_PHONE_ID que vai no Supabase é o do NÚMERO. São diferentes
// e trocar um pelo outro dá erro 100 sem explicar qual campo está errado.
//
// Rodar de novo é seguro: modelo que já existe volta com erro de duplicidade e o
// script segue para o próximo, sem derrubar nada.

const TOKEN = process.env.META_WA_TOKEN;
const WABA = process.env.META_WABA_ID;
const VERSAO = process.env.META_WA_API_VERSION || 'v21.0';
const IDIOMA = 'pt_BR';

if (!TOKEN || !WABA) {
  console.error('Faltam META_WA_TOKEN e/ou META_WABA_ID no ambiente. Veja o cabeçalho deste arquivo.');
  process.exit(1);
}

// ─── Os três modelos ────────────────────────────────────────────────────────
//
// A ORDEM DAS VARIÁVEIS É CONTRATO COM O CÓDIGO. O {{1}} daqui é o primeiro
// item do array `variaveis` na função correspondente. Trocar de lado não dá
// erro nenhum: entrega a mensagem com a data no lugar do nome.

const MODELOS = [
  {
    // 1. Código de verificação — categoria própria, corpo gerado pela Meta.
    // Não se escreve o texto: escolhe-se o comportamento.
    nome: 'codigo_verificacao',
    endpoint: 'upsert_message_templates',
    corpo: {
      name: 'codigo_verificacao',
      languages: [IDIOMA],
      category: 'AUTHENTICATION',
      components: [
        // O aviso de "não compartilhe" existe porque o golpe mais comum no
        // Brasil é ligar para a pessoa pedindo o código que acabou de chegar.
        { type: 'BODY', add_security_recommendation: true },
        // 10 minutos para casar com MINUTOS_CODIGO na função verificar-telefone.
        // Mudar aqui sem mudar lá faz a mensagem prometer um prazo e o servidor
        // praticar outro.
        { type: 'FOOTER', code_expiration_minutes: 10 },
        // Vira um toque em vez de digitação — é a diferença entre completar e
        // desistir no celular.
        { type: 'BUTTONS', buttons: [{ type: 'OTP', otp_type: 'COPY_CODE' }] },
      ],
    },
  },
  {
    // 2. Aviso ao médico de que uma consulta foi paga.
    nome: 'novo_agendamento_medico',
    endpoint: 'message_templates',
    corpo: {
      name: 'novo_agendamento_medico',
      language: IDIOMA,
      category: 'UTILITY',
      components: [
        {
          type: 'BODY',
          text:
            'Novo agendamento confirmado no aviDoc.\n\n' +
            'Paciente: {{1}}\n' +
            'Data: {{2}} às {{3}}\n' +
            'Protocolo: {{4}}\n\n' +
            'Os detalhes estão no seu painel.',
          example: { body_text: [['Maria Souza', '12/08/2026', '14:30', 'AVD-2026-0812-0001']] },
        },
      ],
    },
  },
  {
    // 3. Confirmação para o paciente. É a única das três que a pessoa está
    // esperando: ela acabou de pagar e quer saber que o horário é dela.
    nome: 'agendamento_confirmado_paciente',
    endpoint: 'message_templates',
    corpo: {
      name: 'agendamento_confirmado_paciente',
      language: IDIOMA,
      category: 'UTILITY',
      components: [
        {
          type: 'BODY',
          text:
            'Oi, {{1}}! Sua consulta está confirmada.\n\n' +
            'Profissional: {{2}}\n' +
            'Data: {{3}} às {{4}}\n' +
            'Protocolo: {{5}}\n\n' +
            'O profissional entra em contato por este WhatsApp no horário marcado. Guarde esta mensagem.',
          example: {
            body_text: [['Maria', 'Dr. Ryan de Brito', '12/08/2026', '14:30', 'AVD-2026-0812-0001']],
          },
        },
      ],
    },
  },
];

// ─── Envio ──────────────────────────────────────────────────────────────────

const criar = async (modelo) => {
  const url = `https://graph.facebook.com/${VERSAO}/${WABA}/${modelo.endpoint}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(modelo.corpo),
  });
  const dados = await resp.json().catch(() => ({}));

  if (resp.ok) {
    const status = dados.status || dados.data?.[0]?.status || 'enviado para análise';
    return { ok: true, detalhe: status };
  }

  const erro = dados.error || {};
  // 100 com subcódigo 2388023 é "já existe" — não é falha, é idempotência.
  const jaExiste = /already exists/i.test(erro.error_user_msg || erro.message || '');
  return {
    ok: jaExiste,
    detalhe: jaExiste ? 'já existia' : (erro.error_user_msg || erro.message || `HTTP ${resp.status}`),
  };
};

console.log(`Criando modelos na conta ${WABA} (${IDIOMA})…\n`);
let falhou = false;
for (const modelo of MODELOS) {
  const r = await criar(modelo);
  console.log(`  ${r.ok ? '✓' : '✗'} ${modelo.nome.padEnd(34)} ${r.detalhe}`);
  if (!r.ok) falhou = true;
}

if (falhou) {
  console.log('\nAlgum modelo não passou. Como ler o motivo acima:\n');
  console.log('  "não tem permissão para criar um modelo"');
  console.log('      Estado da CONTA, não do texto. A categoria Autenticação exige');
  console.log('      empresa verificada — Gerenciador de Negócios → Central de Verificações.\n');
  console.log('  "Object with ID ... does not exist ... missing permissions"');
  console.log('      O token não enxerga a conta. Atribua a conta do WhatsApp ao usuário');
  console.log('      do sistema (Ativos → Contas do WhatsApp → controle total) e GERE UM');
  console.log('      TOKEN NOVO: o antigo não ganha o acesso retroativamente.\n');
  console.log('  Qualquer outra coisa costuma ser redação. Me mande o texto.');
} else {
  console.log('\nOs três estão na fila de análise da Meta. Costuma sair em minutos;');
  console.log('até lá nada é entregue.');
}
process.exit(falhou ? 1 : 0);
