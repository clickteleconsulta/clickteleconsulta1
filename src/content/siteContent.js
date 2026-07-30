// Conteúdo de SEO: FAQ e artigos do blog. Textos dentro das regras do CFM
// (sem promessa de resultado/cupom/sorteio) e no posicionamento de marketplace.

export const FAQ = [
  {
    q: 'O que é a Click Teleconsulta?',
    a: 'A Click Teleconsulta é um marketplace de agendamento de teleconsultas: conectamos você a médicos parceiros e cuidamos do agendamento e do pagamento. O atendimento é conduzido pelo próprio profissional, que é o responsável pela consulta.',
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
    a: 'Você pode pagar por Pix ou cartão de crédito, com processamento pela instituição de pagamento parceira. O agendamento é confirmado assim que o pagamento é aprovado.',
  },
  {
    q: 'Como funciona o atendimento por teleconsulta?',
    a: 'Depois do pagamento confirmado, o médico entra em contato até 15 minutos antes do horário para conduzir a teleconsulta pelos meios próprios dele (por vídeo). Fique atento ao seu WhatsApp e e-mail cadastrados.',
  },
  {
    q: 'Recebo receita ou atestado?',
    a: 'A emissão de receitas, atestados e demais documentos é uma decisão exclusiva do médico, conforme a avaliação clínica e as normas do Conselho Federal de Medicina. Quando aplicável, o profissional emite com assinatura digital válida.',
  },
  {
    q: 'Meus dados ficam protegidos?',
    a: 'Sim. Tratamos seus dados conforme a Lei Geral de Proteção de Dados (LGPD). Você pode acessar e exportar seus dados na sua conta, e os médicos parceiros são verificados pelo CRM.',
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
    q: 'A Click é uma operadora de plano de saúde?',
    a: 'Não. Não somos plano de saúde, convênio nem cartão de desconto, e não somos uma plataforma de telemedicina. Somos um marketplace de agendamentos: intermediamos o agendamento e o pagamento entre pacientes e médicos independentes.',
  },
];

export const ARTICLES = [
  {
    slug: 'como-funciona-a-teleconsulta',
    title: 'Como funciona a teleconsulta: guia completo para pacientes',
    description: 'Entenda o que é a teleconsulta, como agendar, o que esperar do atendimento online e como se preparar.',
    date: '2026-07-30',
    readMin: 5,
    body: [
      { t: 'p', c: 'A teleconsulta é o atendimento médico realizado à distância, por vídeo, sem que você precise sair de casa. É uma modalidade regulamentada pelo Conselho Federal de Medicina (Resolução CFM nº 2.314/2022) e vem tornando o acesso à saúde mais simples e rápido.' },
      { t: 'h2', c: 'Como agendar em poucos passos' },
      { t: 'p', c: 'Na Click Teleconsulta, você escolhe um médico disponível, seleciona o horário, cria sua conta em menos de 1 minuto e conclui o pagamento. Assim que o pagamento é aprovado, a consulta fica confirmada.' },
      { t: 'h2', c: 'O que acontece no dia da consulta' },
      { t: 'p', c: 'O médico entra em contato até 15 minutos antes do horário marcado para conduzir a teleconsulta pelos meios próprios dele. Por isso, mantenha seu WhatsApp e e-mail à mão.' },
      { t: 'h2', c: 'Como se preparar' },
      { t: 'ul', items: ['Esteja num ambiente reservado e com boa conexão de internet;', 'Tenha em mãos exames recentes e a lista de medicamentos que usa;', 'Entre alguns minutos antes do horário;', 'Anote suas dúvidas para não esquecer nada.'] },
      { t: 'h2', c: 'Receita e atestado' },
      { t: 'p', c: 'A emissão de receitas e atestados depende da avaliação do médico e das normas do CFM. Quando cabível, o profissional emite documentos com assinatura digital válida.' },
      { t: 'p', c: 'A Click Teleconsulta é um marketplace de agendamentos: conectamos você ao médico e cuidamos do agendamento e do pagamento. O atendimento é responsabilidade do profissional.' },
    ],
  },
  {
    slug: 'renovacao-de-receita-por-teleconsulta',
    title: 'Renovação de receita por teleconsulta: como funciona',
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
      { t: 'p', c: 'Importante: a Click intermedia o agendamento; o atendimento e qualquer prescrição são de responsabilidade do médico.' },
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
      { t: 'p', c: 'Na Click Teleconsulta, os médicos parceiros são verificados pelo registro no CRM. O médico tem autonomia para indicar, quando necessário, que o caso exige avaliação presencial.' },
      { t: 'h2', c: 'Proteção dos seus dados (LGPD)' },
      { t: 'p', c: 'Seus dados cadastrais e de agendamento são tratados conforme a LGPD, usados apenas para viabilizar o serviço. Você pode acessar e exportar seus dados na sua conta a qualquer momento.' },
      { t: 'h2', c: 'Quando a teleconsulta pode não ser indicada' },
      { t: 'p', c: 'Nem toda situação é adequada ao atendimento à distância. É direito do médico e do paciente interromper e indicar a continuidade presencial, sem cobrança adicional.' },
      { t: 'p', c: 'Lembre-se: a plataforma cuida do agendamento e do pagamento; o cuidado clínico é conduzido pelo médico responsável.' },
    ],
  },
];

export const getArticle = (slug) => ARTICLES.find((a) => a.slug === slug);
