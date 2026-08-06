import { BRAND } from '@/config/brand';
// Conteúdo de SEO: FAQ e artigos do blog. Textos dentro das regras do CFM
// (sem promessa de resultado/cupom/sorteio) e no posicionamento de marketplace.

export const FAQ = [
  {
    q: `O que é a ${BRAND.name}?`,
    a: `A ${BRAND.name} é um marketplace de agendamento de teleconsultas: conectamos você a médicos parceiros e cuidamos do agendamento e do pagamento. O atendimento é conduzido pelo próprio profissional, que é o responsável pela consulta.`,
  },
  {
    q: 'Como agendo uma consulta?',
    a: 'É simples: escolha um médico disponível, selecione o horário, crie sua conta (leva menos de 1 minuto) e conclua o pagamento. Pronto — sua consulta fica confirmada e o médico entra em contato no horário marcado.',
  },
  {
    q: 'Quanto custa uma teleconsulta?',
    a: 'As consultas particulares começam a partir de R$ 40. O valor de cada médico aparece no perfil dele, antes de você confirmar. Você paga só quando usa, sem mensalidade nem assinatura.',
  },
  {
    q: 'Quais as formas de pagamento?',
    a: 'Você pode pagar por Pix ou cartão de crédito, processados pelo Asaas — Instituição de Pagamento. O agendamento é confirmado assim que o pagamento é aprovado.',
  },
  {
    q: 'Como funciona o atendimento por teleconsulta?',
    a: 'Depois do pagamento confirmado, o médico entra em contato até 15 minutos antes do horário para conduzir a teleconsulta pelos meios próprios dele (por vídeo). Fique atento ao seu WhatsApp e e-mail cadastrados.',
  },
  {
    q: 'A teleconsulta tem validade legal no Brasil?',
    a: 'Sim. O atendimento a distância está autorizado pela Lei nº 14.510/2022, que incluiu a telessaúde na Lei nº 8.080/1990, e é regulamentado pela Resolução CFM nº 2.314/2022. A teleconsulta segue os mesmos princípios éticos e o mesmo sigilo da consulta presencial.',
  },
  {
    q: 'Vocês atendem em todo o Brasil?',
    a: 'Você pode agendar de qualquer lugar do país: como o atendimento é a distância, não há limite de estado ou cidade. Os médicos parceiros têm registro ativo no CRM, válido em território nacional, conferido por nós antes de eles aparecerem na plataforma. Basta ter internet e um ambiente reservado no horário marcado.',
  },
  {
    q: 'Recebo receita ou atestado?',
    a: 'A emissão de receitas, atestados e demais documentos é uma decisão exclusiva do médico, conforme a avaliação clínica e as normas do Conselho Federal de Medicina. Quando cabível, o profissional emite o documento em PDF com assinatura digital.',
  },
  {
    q: 'Que documentos o médico pode emitir depois da consulta?',
    a: 'Quando a avaliação clínica indicar, o médico pode emitir prescrição (receita) digital, solicitação de exames e atestado médico. Todos em PDF assinado digitalmente. A emissão nunca é automática nem garantida: depende do critério do profissional, como em qualquer consulta.',
  },
  {
    q: 'Como sei que a receita ou o atestado é verdadeiro?',
    a: 'Documentos assinados com certificado digital do padrão ICP-Brasil podem ser conferidos gratuitamente no validador oficial do Governo Federal, em validar.iti.gov.br: você envia o PDF e o site mostra quem assinou e se o arquivo foi alterado depois. Quando o documento traz QR code, ele leva à mesma conferência. Veja o passo a passo na página Documentos e validade.',
  },
  {
    q: 'Como vocês tratam a ética e o sigilo?',
    a: 'O que você conversa com o médico é protegido pelo sigilo profissional previsto no Código de Ética Médica (Resolução CFM nº 2.217/2018), e a aviDoc não tem acesso ao conteúdo clínico do atendimento. Seus dados de cadastro e agendamento são tratados conforme a LGPD (Lei nº 13.709/2018) e usados apenas para viabilizar o serviço.',
  },
  {
    q: 'Meus dados ficam protegidos?',
    a: 'Sim. Tratamos seus dados conforme a Lei Geral de Proteção de Dados (LGPD). Você pode acessar e exportar seus dados na sua conta, e conferimos a identidade e o registro profissional de cada médico parceiro.',
  },
  {
    q: 'Posso cancelar e ter reembolso?',
    a: 'Sim, conforme a Política de Cancelamento: cancelando com 2 horas ou mais de antecedência, o reembolso é integral; com menos de 2 horas, o reembolso é de 50%; em caso de não comparecimento, não há reembolso. No reembolso integral é retida apenas a taxa de processamento.',
  },
  {
    q: 'Preciso instalar algum aplicativo?',
    a: 'Não é necessário instalar nada para agendar — tudo é feito pelo site. O atendimento é conduzido pelo médico pelos meios que ele utilizar, informados a você antes da consulta.',
  },
  {
    q: `A ${BRAND.name} é uma operadora de plano de saúde?`,
    a: 'Não. Não somos plano de saúde, convênio nem cartão de desconto, e não somos uma plataforma de telemedicina. Somos um marketplace de agendamentos: intermediamos o agendamento e o pagamento entre pacientes e médicos independentes.',
  },
];

// ─── Quando a teleconsulta é indicada ──────────────────────────────────────────
/**
 * A pergunta que trava a decisão: "serve para o meu caso?".
 *
 * O TEXTO É DO PRÓPRIO USUÁRIO, e é assim que tem de continuar. A primeira
 * versão espelhava a lista de sintomas do telemedicina.einstein.br — diarreia,
 * dor de garganta, sinusite. Ele trocou por esta, que é melhor por duas razões:
 * fala em GRUPOS de sintomas em vez de nomear doenças, e traz "a critério do
 * profissional" dentro da própria frase.
 *
 * E A ATRIBUIÇÃO É O PONTO. A aviDoc não julga o que cabe numa teleconsulta —
 * quem conduz o atendimento e decide a conduta é o médico. Por isso nada aqui é
 * dito na voz da plataforma ("atendemos", "resolvemos"): o texto descreve a
 * modalidade e devolve a decisão a quem é dela.
 *
 * O Einstein pode listar sintomas porque é o prestador, com corpo clínico
 * próprio. Aqui o prestador é o profissional que a pessoa escolher.
 */
export const QUANDO_USAR = {
  titulo: 'Quando a teleconsulta é indicada',
  chamada:
    'Consultas ideais para sintomas leves, orientações médicas, pedidos de exames e renovação de receitas de uso contínuo — a critério do profissional.',
  // Grupos, e não doenças nomeadas. Palavras do usuário.
  situacoes: [
    'Sintomas respiratórios',
    'Sintomas gastrointestinais',
    'Sintomas urinários',
    'Sintomas musculares',
    'Cefaleia',
    'Orientações médicas',
    'Pedido de exames',
    'Renovação de receita de uso contínuo',
  ],
  criterio:
    'A indicação e a conduta são do médico que conduz o atendimento, avaliadas caso a caso durante a consulta.',
  presencial: {
    titulo: 'Quando o atendimento presencial é necessário',
    // Frase já publicada no artigo do blog e no texto do próprio médico: a
    // decisão de interromper é do médico E do paciente, não da plataforma.
    texto:
      'Quando a conduta depende de exame físico, de procedimento ou de recursos que só existem no consultório. É direito do médico e do paciente interromper e indicar a continuidade presencial, sem cobrança adicional.',
    urgencia:
      'Situação de risco imediato é urgência: procure o pronto-socorro mais próximo ou ligue 192 (SAMU).',
  },
};

export const ARTICLES = [
  {
    slug: 'consulta-medica-online-sem-convenio',
    title: 'Consulta médica online sem convênio',
    description: 'Como funciona pagar particular por uma teleconsulta: preço visível antes de agendar, a partir de R$ 40, sem mensalidade e sem carência.',
    date: '2026-08-06',
    readMin: 3,
    body: [
      { t: 'p', c: 'Consultar sem plano de saúde não significa pagar caro nem esperar. No atendimento particular online você vê o valor antes de escolher, agenda direto com o profissional e não passa por autorização, carência ou rede credenciada.' },
      { t: 'h2', c: 'Não existe mensalidade' },
      { t: 'p', c: `Na ${BRAND.name} você paga a consulta que marcar, e só ela. Não há taxa de adesão, assinatura nem fidelidade — quem consulta uma vez por ano paga uma vez por ano. As consultas começam em R$ 40.` },
      { t: 'h2', c: 'O preço aparece antes da escolha' },
      { t: 'p', c: 'Cada profissional define quanto cobra, e o valor fica visível na lista, junto com os horários livres. Você compara e decide antes de criar conta ou informar qualquer dado de pagamento.' },
      { t: 'h2', c: 'Sem carência e sem autorização' },
      { t: 'p', c: 'Como não há plano no meio, também não há prazo de carência para começar a usar nem pedido de autorização prévia. Escolheu o horário e o pagamento foi aprovado, o agendamento está confirmado.' },
      { t: 'h2', c: 'Os documentos valem igual' },
      { t: 'p', c: 'Receita, atestado e pedido de exame emitidos na consulta particular online têm a mesma validade dos de qualquer outro atendimento, porque são assinados com certificado digital do padrão ICP-Brasil.' },
      { t: 'h2', c: 'Formas de pagamento' },
      { t: 'p', c: 'Você pode pagar por Pix ou cartão de crédito, processados pelo Asaas — Instituição de Pagamento. O agendamento é confirmado assim que o pagamento é aprovado.' },
    ],
  },
  {
    slug: 'o-que-a-teleconsulta-resolve',
    title: 'O que dá para resolver em teleconsulta',
    description: 'Nem toda situação é adequada ao atendimento a distância. Entenda o que a consulta online cobre e quando o médico indica atendimento presencial.',
    date: '2026-08-06',
    readMin: 3,
    body: [
      { t: 'p', c: 'A teleconsulta é o exercício da medicina a distância, regulamentado pela Resolução CFM nº 2.314/2022. Ela cobre boa parte do que se faz numa consulta de rotina — conversar sobre sintomas, revisar histórico, interpretar exames, orientar tratamento —, mas não substitui tudo.' },
      { t: 'h2', c: 'Quem decide o que cabe é o médico' },
      { t: 'p', c: 'Nem toda situação é adequada ao atendimento a distância. É direito do médico e do paciente interromper e indicar a continuidade presencial, sem cobrança adicional. Essa avaliação é clínica e acontece durante a consulta, não antes dela.' },
      { t: 'h2', c: 'O que costuma se resolver bem online' },
      { t: 'ul', items: [
        'Revisão de exames e orientação sobre resultados;',
        'Acompanhamento de quadro já conhecido pelo médico;',
        'Renovação de prescrição de uso contínuo, quando o profissional avalia que é o caso;',
        'Dúvidas sobre tratamento em andamento;',
        'Primeira avaliação de sintomas, para orientar o próximo passo.',
      ] },
      { t: 'h2', c: 'Quando o presencial é necessário' },
      { t: 'p', c: 'Sempre que a conduta depender de exame físico, de procedimento ou de recursos que só existem no consultório ou no hospital. Nesses casos o médico orienta o encaminhamento — e é isso que se espera de um bom atendimento, online ou não.' },
      { t: 'h2', c: 'Urgência e emergência não são teleconsulta' },
      { t: 'p', c: 'Situações de risco imediato exigem serviço de urgência presencial. Em caso de emergência, procure o pronto-socorro mais próximo ou ligue para o SAMU (192).' },
    ],
  },
  {
    slug: 'sigilo-e-protecao-de-dados-na-teleconsulta',
    title: 'Sigilo e proteção de dados na teleconsulta',
    description: 'O que você conversa com o médico é protegido pelo sigilo profissional. Veja o que a plataforma trata dos seus dados e o que a LGPD garante.',
    date: '2026-08-06',
    readMin: 3,
    body: [
      { t: 'p', c: 'Consultar pela internet levanta uma dúvida legítima: quem tem acesso ao que eu contei? A resposta separa duas coisas que costumam ser confundidas — o conteúdo clínico e os dados de cadastro.' },
      { t: 'h2', c: 'O que você conversa com o médico' },
      { t: 'p', c: 'É protegido pelo sigilo profissional previsto no Código de Ética Médica (Resolução CFM nº 2.217/2018). Esse dever é do profissional e não se desfaz por o atendimento ser online.' },
      { t: 'h2', c: 'O que a plataforma trata' },
      { t: 'p', c: `A ${BRAND.name} não participa da consulta e não tem acesso ao conteúdo clínico do atendimento. O que tratamos são os seus dados de cadastro, agendamento e pagamento, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), e apenas para viabilizar o serviço.` },
      { t: 'h2', c: 'Seus direitos' },
      { t: 'p', c: 'Você pode acessar e exportar esses dados na sua conta a qualquer momento. A Política de Privacidade descreve cada finalidade e a base legal correspondente.' },
      { t: 'h2', c: 'O que não prometemos' },
      { t: 'p', c: 'Respeito ao paciente, para nós, é também não prometer o que não depende de nós: a plataforma garante o agendamento, o pagamento e o reembolso conforme a política publicada. A conduta clínica é do médico, e é assim que deve ser.' },
    ],
  },
  {
    slug: 'receita-e-atestado-digital-tem-validade',
    title: 'Receita e atestado digital têm validade?',
    description: 'Documento assinado digitalmente vale em todo o Brasil. Veja como qualquer pessoa confere a autenticidade de graça no validador oficial do Governo Federal.',
    date: '2026-08-06',
    readMin: 4,
    body: [
      { t: 'p', c: 'Sim. Receita, atestado e pedido de exame emitidos em consulta online têm a mesma validade dos emitidos no consultório, desde que assinados com certificado digital do padrão ICP-Brasil — instituído pela Medida Provisória nº 2.200-2/2001 e reconhecido pela Lei nº 14.063/2020.' },
      { t: 'p', c: 'A dúvida costuma aparecer na farmácia ou no RH da empresa, e ela tem uma resposta objetiva: dá para conferir na hora, de graça, no validador oficial do Governo Federal. Farmácia, empresa e escola podem fazer a mesma conferência.' },
      { t: 'h2', c: 'Como conferir em 3 passos' },
      { t: 'ul', items: [
        'Guarde o arquivo PDF original que o médico enviou — não uma foto nem uma impressão dele, porque a assinatura vive dentro do arquivo.',
        'Abra validar.iti.gov.br, o validador do Instituto Nacional de Tecnologia da Informação (ITI).',
        'Envie o PDF e confirme o resultado: o site mostra quem assinou, quando assinou e se o arquivo foi alterado depois disso.',
      ] },
      { t: 'h2', c: 'Por que a foto do documento não serve' },
      { t: 'p', c: 'A assinatura digital não é a imagem de uma rubrica: é um dado criptográfico gravado dentro do PDF. Ao fotografar ou imprimir, esse dado se perde e não há mais o que conferir. Guarde e encaminhe sempre o arquivo original.' },
      { t: 'h2', c: 'E o QR code?' },
      { t: 'p', c: 'Quando o documento traz um QR code, ele é um atalho para essa mesma conferência: a leitura leva à página de verificação do sistema que emitiu o documento. O QR é uma comodidade; a prova de autenticidade é a assinatura digital dentro do PDF.' },
      { t: 'h2', c: 'Quem emite o documento' },
      { t: 'p', c: `Quem emite e assina é o médico que atendeu você, com o registro profissional dele. A ${BRAND.name} cuida do agendamento e do pagamento — a decisão clínica e os documentos são do profissional.` },
    ],
  },
  {
    slug: 'quanto-custa-uma-teleconsulta',
    title: 'Quanto custa uma teleconsulta e como pagar',
    description: 'Preço visível antes de agendar, a partir de R$ 40, com Pix ou cartão. Sem mensalidade e sem convênio — veja como funciona.',
    date: '2026-08-06',
    readMin: 3,
    body: [
      { t: 'p', c: `Na ${BRAND.name} o valor aparece antes de você agendar, no próprio cartão do médico, junto com os horários livres. Não há mensalidade, taxa de adesão nem necessidade de convênio: você paga a consulta que marcar, e só ela. As consultas começam em R$ 40.` },
      { t: 'h2', c: 'Por que cada médico tem um preço' },
      { t: 'p', c: 'Cada profissional define quanto cobra pelo próprio atendimento. Por isso os valores variam de um card para outro — e por isso o preço fica visível na lista, antes da escolha, em vez de aparecer só no fim.' },
      { t: 'h2', c: 'Formas de pagamento' },
      { t: 'p', c: 'Você pode pagar por Pix ou cartão de crédito, processados pelo Asaas — Instituição de Pagamento. O agendamento é confirmado assim que o pagamento é aprovado.' },
      { t: 'h2', c: 'O que está incluído' },
      { t: 'p', c: 'O valor cobre a consulta com o médico escolhido. A emissão de receita, atestado ou pedido de exame, quando clinicamente indicada, é decisão do profissional e não é cobrada à parte.' },
      { t: 'h2', c: 'Se precisar cancelar' },
      { t: 'p', c: 'Cancelando com 2 horas ou mais de antecedência, o reembolso é integral; com menos de 2 horas, o reembolso é de 50%; em caso de não comparecimento, não há reembolso. No reembolso integral é retida apenas a taxa de processamento.' },
    ],
  },
  {
    slug: 'como-cancelar-ou-remarcar-uma-teleconsulta',
    title: 'Como cancelar ou remarcar uma teleconsulta',
    description: 'A regra de reembolso, o prazo que muda o valor devolvido e o passo a passo para cancelar pela sua conta.',
    date: '2026-08-06',
    readMin: 3,
    body: [
      { t: 'p', c: 'Imprevisto acontece, e a regra é simples: quanto mais cedo você avisar, mais integral é a devolução. O que decide o valor é a antecedência em relação ao horário marcado.' },
      { t: 'h2', c: 'A regra de reembolso' },
      { t: 'ul', items: [
        '2 horas ou mais de antecedência: reembolso integral, retida apenas a taxa de processamento;',
        'Menos de 2 horas: reembolso de 50%;',
        'Não comparecimento, sem aviso: não há reembolso.',
      ] },
      { t: 'p', c: 'A janela existe porque o horário reservado deixa de ser oferecido a outra pessoa e o médico o mantém bloqueado na agenda dele.' },
      { t: 'h2', c: 'Como cancelar' },
      { t: 'p', c: 'Entre na sua conta, abra "Minhas Consultas" e escolha o agendamento. O cancelamento é feito ali, e o reembolso segue pelo mesmo meio do pagamento — o prazo de retorno depende do banco ou da bandeira do cartão.' },
      { t: 'h2', c: 'E se eu quiser remarcar?' },
      { t: 'p', c: 'Cancele dentro da janela de 2 horas ou mais e agende o novo horário normalmente. Assim a devolução é integral e você escolhe outro dia sem prejuízo.' },
      { t: 'h2', c: 'E se o médico cancelar?' },
      { t: 'p', c: 'Se o atendimento não acontecer por indisponibilidade do profissional, o reembolso é integral, independentemente da antecedência.' },
    ],
  },
  {
    slug: 'como-funciona-a-teleconsulta',
    title: 'Como funciona a teleconsulta: guia para pacientes',
    description: 'Entenda o que é a teleconsulta, como agendar, o que esperar do atendimento online e como se preparar.',
    date: '2026-07-30',
    readMin: 5,
    body: [
      { t: 'p', c: 'A teleconsulta é o atendimento médico realizado à distância, por vídeo, sem que você precise sair de casa. É uma modalidade regulamentada pelo Conselho Federal de Medicina (Resolução CFM nº 2.314/2022) e vem tornando o acesso à saúde mais simples e rápido.' },
      { t: 'h2', c: 'Como agendar em poucos passos' },
      { t: 'p', c: `Na ${BRAND.name}, você escolhe um médico disponível, seleciona o horário, cria sua conta em menos de 1 minuto e conclui o pagamento. Assim que o pagamento é aprovado, a consulta fica confirmada.` },
      { t: 'h2', c: 'O que acontece no dia da consulta' },
      { t: 'p', c: 'O médico entra em contato até 15 minutos antes do horário marcado para conduzir a teleconsulta pelos meios próprios dele. Por isso, mantenha seu WhatsApp e e-mail à mão.' },
      { t: 'h2', c: 'Como se preparar' },
      { t: 'ul', items: ['Esteja num ambiente reservado e com boa conexão de internet;', 'Tenha em mãos exames recentes e a lista de medicamentos que usa;', 'Entre alguns minutos antes do horário;', 'Anote suas dúvidas para não esquecer nada.'] },
      { t: 'h2', c: 'Receita e atestado' },
      { t: 'p', c: 'A emissão de receitas e atestados depende da avaliação do médico e das normas do CFM. Quando cabível, o profissional emite documentos com assinatura digital válida.' },
      { t: 'p', c: `A ${BRAND.name} é um marketplace de agendamentos: conectamos você ao médico e cuidamos do agendamento e do pagamento. O atendimento é responsabilidade do profissional.` },
    ],
  },
  {
    slug: 'renovacao-de-receita-por-teleconsulta',
    title: 'Renovação de receita por teleconsulta',
    description: 'Saiba como funciona a orientação médica online para continuidade de tratamento e o que o médico avalia.',
    date: '2026-07-30',
    readMin: 4,
    body: [
      { t: 'p', c: 'Muita gente busca a teleconsulta para dar continuidade a um tratamento já em andamento. A decisão de renovar ou ajustar uma prescrição é sempre do médico, após avaliar o seu caso.' },
      { t: 'h2', c: 'Como é a consulta' },
      { t: 'p', c: 'Você agenda com um médico disponível, explica seu histórico e mostra a receita ou os exames anteriores. Com base nessa avaliação, o profissional decide a conduta mais adequada.' },
      { t: 'h2', c: 'O que ter em mãos' },
      { t: 'ul', items: ['A receita ou prescrição anterior;', 'Exames recentes, se houver;', 'A lista atualizada dos medicamentos que você usa.'] },
      { t: 'h2', c: 'Documentos' },
      { t: 'p', c: 'Quando indicado, o médico pode emitir a prescrição com assinatura digital válida. Tudo conforme a avaliação clínica e as normas do CFM — não há garantia de emissão, pois isso depende do critério médico.' },
      { t: 'p', c: `Importante: a ${BRAND.name} intermedia o agendamento; o atendimento e qualquer prescrição são de responsabilidade do médico.` },
    ],
  },
  {
    slug: 'teleconsulta-e-confiavel-o-que-diz-o-cfm',
    title: 'Teleconsulta é confiável? O que diz o CFM',
    description: 'A teleconsulta é regulamentada no Brasil. Veja como funciona a proteção dos seus dados e a verificação dos médicos.',
    date: '2026-07-30',
    readMin: 4,
    body: [
      { t: 'p', c: 'Sim: a teleconsulta é uma prática regulamentada pelo Conselho Federal de Medicina (Resolução CFM nº 2.314/2022). O atendimento à distância segue os mesmos princípios éticos da consulta presencial.' },
      { t: 'h2', c: 'Médicos verificados' },
      { t: 'p', c: `Na ${BRAND.name}, a conferência é feita pela plataforma: antes de o médico aparecer aqui, verificamos a identidade dele e a validade do registro profissional. O médico tem autonomia para indicar, quando necessário, que o caso exige avaliação presencial.` },
      { t: 'h2', c: 'Proteção dos seus dados (LGPD)' },
      { t: 'p', c: 'Seus dados cadastrais e de agendamento são tratados conforme a LGPD, usados apenas para viabilizar o serviço. Você pode acessar e exportar seus dados na sua conta a qualquer momento.' },
      { t: 'h2', c: 'Quando a teleconsulta pode não ser indicada' },
      { t: 'p', c: 'Nem toda situação é adequada ao atendimento à distância. É direito do médico e do paciente interromper e indicar a continuidade presencial, sem cobrança adicional.' },
      { t: 'p', c: 'Lembre-se: a plataforma cuida do agendamento e do pagamento; o cuidado clínico é conduzido pelo médico responsável.' },
    ],
  },
];

export const getArticle = (slug) => ARTICLES.find((a) => a.slug === slug);

// ─────────────────────────────────────────────────────────────────────────────
// Página "Documentos e validade" (/documentos-e-validade).
//
// LEIA ANTES DE EDITAR: quem emite os documentos é o MÉDICO, com as ferramentas
// dele — a aviDoc não gera receita, atestado nem pedido de exame, e o
// verificador próprio da plataforma (/verificar/:code) está atrás da flag
// FEATURES.PRONTUARIO, hoje desligada. Por isso o texto abaixo atribui a
// emissão e a assinatura ao profissional, e manda conferir no validador do
// Governo Federal, que independe de nós. Trocar "o médico emite" por "emitimos"
// tornaria a página falsa e nos colocaria como plataforma de telemedicina, que
// não somos.
//
// As referências normativas estão nomeadas uma a uma de propósito: é o que
// permite ao leitor (e ao jurídico) conferir cada afirmação na fonte.
// ─────────────────────────────────────────────────────────────────────────────

export const DOCUMENTOS = {
  titulo: 'Documentos e validade',
  chamada:
    'A teleconsulta é reconhecida por lei em todo o Brasil, e os documentos que o médico emite depois dela têm o mesmo valor dos de uma consulta presencial. Veja como conferir a veracidade de cada um.',

  validade: {
    titulo: 'A teleconsulta é válida — e vale em todo o país',
    paragrafos: [
      'O atendimento médico a distância está autorizado pela Lei nº 14.510/2022, que incluiu a telessaúde na Lei nº 8.080/1990, e é regulamentado pela Resolução CFM nº 2.314/2022. Não é uma modalidade paralela nem provisória: é o exercício da medicina, com as mesmas obrigações éticas e o mesmo sigilo da consulta presencial.',
      'Como o atendimento é a distância, não há limite de estado ou de cidade — você agenda de onde estiver. Os médicos parceiros têm registro ativo no CRM, conferido por nós antes de entrarem na plataforma.',
      'A autonomia do médico permanece inteira: se a avaliação indicar que o seu caso precisa de exame presencial, ele deve dizer isso. Essa recomendação é parte do bom atendimento, não uma falha dele.',
    ],
  },

  emissao: {
    titulo: 'O que o médico pode emitir depois da consulta',
    intro:
      'Quando a avaliação clínica indicar, o profissional emite os documentos abaixo em PDF, assinados digitalmente. A emissão é sempre decisão dele — não é automática nem garantida pelo agendamento.',
    itens: [
      {
        titulo: 'Prescrição digital',
        texto: 'A receita dos medicamentos, aceita nas farmácias que recebem receituário eletrônico.',
      },
      {
        titulo: 'Solicitação de exames',
        texto: 'O pedido dos exames que o médico julgar necessários para concluir ou acompanhar o caso.',
      },
      {
        titulo: 'Atestado médico',
        texto: 'O atestado, quando a condição avaliada justificar, com a validade que o profissional indicar.',
      },
    ],
  },

  conferencia: {
    titulo: 'Como conferir se o documento é verdadeiro',
    intro:
      'Documentos assinados com certificado digital do padrão ICP-Brasil — instituído pela Medida Provisória nº 2.200-2/2001 e reconhecido pela Lei nº 14.063/2020 — podem ser conferidos por qualquer pessoa, de graça, no validador oficial do Governo Federal. Farmácia, empresa e escola podem fazer a mesma conferência.',
    passos: [
      'Guarde o arquivo PDF original que o médico enviou — não uma foto nem uma impressão dele, porque a assinatura vive dentro do arquivo.',
      'Abra validar.iti.gov.br, o validador do Instituto Nacional de Tecnologia da Informação (ITI).',
      'Envie o PDF e confirme o resultado: o site mostra quem assinou, quando assinou e se o arquivo foi alterado depois disso.',
    ],
    qr: {
      titulo: 'E o QR code?',
      texto:
        'Quando o documento traz um QR code, ele é um atalho para essa mesma conferência: a leitura leva à página de verificação do sistema que emitiu o documento. O QR é uma comodidade; a prova de autenticidade é a assinatura digital dentro do PDF.',
    },
    url: 'https://validar.iti.gov.br',
  },

  etica: {
    titulo: 'Ética, dignidade e sigilo',
    paragrafos: [
      'O que você conversa com o médico é protegido pelo sigilo profissional previsto no Código de Ética Médica (Resolução CFM nº 2.217/2018). Esse dever é do profissional e não se desfaz por o atendimento ser online.',
      `A ${BRAND.name} não participa da consulta e não tem acesso ao conteúdo clínico do atendimento. O que tratamos são os seus dados de cadastro, agendamento e pagamento, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), e apenas para viabilizar o serviço. Você pode acessar e exportar esses dados na sua conta.`,
      'Respeito ao paciente, para nós, é também não prometer o que não depende de nós: a plataforma garante o agendamento, o pagamento e o reembolso conforme a política publicada. A conduta clínica é do médico, e é assim que deve ser.',
    ],
  },

  // Cada afirmação da página tem uma norma correspondente aqui.
  normas: [
    { n: 'Lei nº 14.510/2022', d: 'Inclui a telessaúde na Lei nº 8.080/1990 e autoriza o atendimento a distância em todo o território nacional.' },
    { n: 'Resolução CFM nº 2.314/2022', d: 'Define e regulamenta a telemedicina como forma de serviço médico mediado por tecnologia.' },
    { n: 'Medida Provisória nº 2.200-2/2001', d: 'Institui a ICP-Brasil e dá validade jurídica aos documentos assinados digitalmente nesse padrão.' },
    { n: 'Lei nº 14.063/2020', d: 'Dispõe sobre o uso de assinaturas eletrônicas, inclusive em documentos da área da saúde.' },
    { n: 'Resolução CFM nº 2.217/2018', d: 'Código de Ética Médica — sigilo profissional e deveres do médico com o paciente.' },
    { n: 'Lei nº 13.709/2018 (LGPD)', d: 'Regula o tratamento de dados pessoais, inclusive os dados de saúde.' },
  ],
};
