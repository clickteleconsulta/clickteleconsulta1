#!/usr/bin/env python3
"""
Monta os .md da versão 1.1 dos três documentos legais.

POR QUE É SCRIPT E NÃO EDIÇÃO À MÃO
São 49 mil caracteres de texto jurídico vigente. Retranscrever isso é garantir
que alguma palavra mude sem ninguém perceber — e num contrato, palavra que muda
sozinha é o pior defeito possível.

Então aqui o texto EXISTENTE é apenas transformado (quebra de linha do PDF vira
parágrafo, título numerado vira `##`) e o texto NOVO é acrescentado em pontos
explícitos. Nada é reescrito.

O QUE ENTRA DE NOVO, E POR QUÊ
Tudo abaixo sai de fato verificado no código, não de opinião:

  Política, seção 3   os identificadores de clique (ttclid/fbclid/gclid) que
                      src/lib/atribuicao.js captura e guarda por 30 dias
  Política, seção 8   Cloudflare, TikTok, Meta e Google como destinatários
  Política, seção 11  prazos concretos de retenção
  Política, seção 12  prazo de resposta ao titular
  Política, nova 12.4 direito de revisão de decisão automatizada
  Adesão, nova
  cláusula            não comparecimento, com a regra exata da função
                      medico_marcar_nao_comparecimento

Uso:
    python3 tools/preparar-v11.py
"""
import os
import re

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASTA = os.path.join(RAIZ, 'documentos-legais')

VERSAO = 'Versão 1.1 · 6 de agosto de 2026'


def para_markdown(texto):
    """Texto extraído do PDF -> markdown do gerador, sem tocar nas palavras."""
    linhas = texto.split('\n')
    fora, buffer = [], []

    def despeja():
        if buffer:
            fora.append(' '.join(buffer))
            fora.append('')
            buffer.clear()

    # As duas ou três primeiras linhas são o título e o subtítulo, que o gerador
    # redesenha a partir do `# ` do markdown. Sem pular, elas voltavam grudadas
    # no primeiro parágrafo e o documento abria repetindo o próprio nome.
    cabecalho = True

    for linha in linhas:
        l = linha.strip()
        if not l:
            despeja()
            continue
        # "avi" e "Doc" soltos são o wordmark do cabeçalho, que o gerador
        # redesenha; e o rodapé institucional ele também refaz sozinho.
        if l in ('avi', 'Doc', 'avi Doc', '000'):
            continue
        if l.startswith('CLICK TELECONSULTA ONLINE LTDA · CNPJ') or l.startswith('aviDoc é o nome comercial'):
            continue
        if cabecalho:
            # O cabeçalho acaba na primeira linha que é texto corrido de verdade
            # — a que começa a frase de abertura do documento.
            if len(l) < 90 and not l.endswith('.'):
                continue
            cabecalho = False
        if re.match(r'^\d{1,2}\.\s{1,3}[A-ZÁÂÃÉÊÍÓÔÕÚÇ]', l):
            despeja()
            fora.append(f'## {l}')
            fora.append('')
            continue
        # Item numerado (1.1, 12.3, 4A.2) abre parágrafo novo. Sem isso, uma
        # seção inteira vira um bloco corrido e some a separação entre os itens
        # — que num contrato é o que permite citar "nos termos do item 1.2".
        #
        # O `\s` no fim NÃO é enfeite: sem ele, "2.314/2022" (a Resolução do
        # CFM) casa como se fosse o item 2.3, e o número da resolução é partido
        # ao meio, deixando "nº" no fim de um parágrafo e "2.314/2022" no começo
        # do seguinte. O mesmo valeria para 13.709/2018 e 2.336/2023.
        if re.match(r'^\d{1,2}[A-Z]?\.\d{1,2}\s', l):
            despeja()
        buffer.append(l)
    despeja()
    return '\n'.join(fora)


def inserir_depois(texto, ancora, novo):
    """Insere `novo` logo após o parágrafo que contém `ancora`."""
    i = texto.index(ancora)
    fim = texto.index('\n\n', i) + 2
    return texto[:fim] + novo.strip() + '\n\n' + texto[fim:]


# ─────────────────────────────────────────────────────────────────────────────
# Texto novo. Cada bloco declara o que a plataforma faz de fato.

CLIQUES = """
De publicidade (coletados automaticamente): quando você chega à Plataforma a partir de um anúncio, a URL de entrada traz um identificador de clique gerado pela plataforma de anúncios — `ttclid` (TikTok), `fbclid` (Meta) ou `gclid` (Google). Guardamos esse identificador por até 30 (trinta) dias e o associamos ao agendamento, com a finalidade exclusiva de medir quais anúncios resultam em consulta efetivamente contratada. Ele não identifica você diretamente e só é utilizado quando você consente com os cookies de marketing.
"""

DESTINATARIOS = """
Plataformas de publicidade e medição — TikTok (TikTok Pte. Ltd.), Meta (Meta Platforms, Inc.) e Google (Google LLC), quando você consente com os cookies de marketing, para medir o resultado de campanhas. A esses destinatários enviamos o identificador de clique descrito na seção 3 e a informação de que uma compra ocorreu, com o respectivo valor. Não enviamos seu nome, CPF, e-mail, telefone nem qualquer dado de saúde. O envio ocorre pelo seu navegador e também pelos nossos servidores, no momento em que o pagamento é confirmado. Se você recusar os cookies de marketing, nenhum envio é feito.
Provedor de proteção contra automação — Cloudflare, Inc., que verifica se o acesso à área de login parte de uma pessoa e não de um robô. Para isso, processa o endereço IP e características técnicas do navegador de quem tenta entrar. A verificação é necessária à segurança das contas e ocorre em todo acesso autenticado.
"""

RETENCAO = """
11.4 Prazos de retenção. Salvo obrigação legal diversa, observamos os seguintes prazos, contados do encerramento da relação ou da coleta, conforme o caso: (I) dados cadastrais: enquanto a conta existir e por 5 (cinco) anos após o seu encerramento, prazo geral de prescrição para a cobrança de dívidas e para a reparação civil; (II) registros de agendamentos, consultas e pagamentos: 5 (cinco) anos, também pelo prazo fiscal aplicável, mantidos de forma íntegra e rastreável conforme o item 11.3; (III) registros de acesso à aplicação (logs): 6 (seis) meses, nos termos do art. 15 do Marco Civil da Internet, podendo ser guardados por mais tempo mediante requisição de autoridade; (IV) identificadores de clique de anúncio: 30 (trinta) dias; (V) dados tratados com base no seu consentimento: até a revogação, ressalvadas as demais hipóteses deste item.
"""

PRAZO_RESPOSTA = """
12.4 Prazo de resposta. Respondemos às suas solicitações em até 15 (quinze) dias corridos, contados do recebimento do pedido, prazo que pode ser prorrogado uma única vez, por igual período, quando a complexidade da solicitação justificar — hipótese em que você será informado da prorrogação e do seu motivo. Pedidos de simples confirmação da existência de tratamento são respondidos em formato simplificado, de imediato.

12.5 Decisões automatizadas. Você tem direito a solicitar a revisão de decisões tomadas unicamente com base em tratamento automatizado de dados que afetem seus interesses, nos termos do art. 20 da LGPD. Atualmente a Plataforma não toma decisões desse tipo: a ordenação dos Médicos Parceiros exibida a você decorre de critérios objetivos de disponibilidade, especialidade, preço e avaliação, e não de perfilamento do seu comportamento. Caso isso mude, informaremos nesta Política e o direito de revisão poderá ser exercido pelo canal da seção 13.
"""

NAO_COMPARECIMENTO = """
## 4A.  DO NÃO COMPARECIMENTO DO PACIENTE

4A.1 Após o horário agendado, e desde que a consulta esteja paga e ainda não conste como realizada ou cancelada, o PARCEIRO pode registrar na Plataforma o não comparecimento do PACIENTE. O registro é privativo do PARCEIRO responsável pelo atendimento e não pode ser feito antes do horário marcado.

4A.2 O registro é gravado em trilha de auditoria, com data, hora e autoria, e o PACIENTE é notificado automaticamente. Registrado o não comparecimento, não há reembolso ao PACIENTE, conforme a Política de Cancelamento, e o valor segue para repasse ao PARCEIRO nas condições ordinárias deste Termo.

4A.3 O registro indevido de não comparecimento — em especial o de consulta efetivamente realizada ou não iniciada por causa atribuível ao PARCEIRO — configura descumprimento deste Termo e sujeita o PARCEIRO às medidas da cláusula de suspensão e descredenciamento, sem prejuízo do estorno ao PACIENTE.
"""

TABELA_FINALIDADES = """
| Finalidade | Base legal (LGPD) |
|---|---|
| Criar e manter sua conta; agendar e viabilizar a teleconsulta | Execução de contrato (art. 7º, V) |
| Processar pagamentos e reembolsos | Execução de contrato (art. 7º, V) |
| Enviar confirmações, lembretes e comunicações do atendimento | Execução de contrato / legítimo interesse (art. 7º, V e IX) |
| Atendimento de dependente sob representação legal | Tutela / representação (art. 7º, V e art. 14) |
| Emitir documentos fiscais e cumprir obrigações legais e regulatórias | Obrigação legal (art. 7º, II) |
| Segurança, prevenção a fraude, auditoria e melhoria da Plataforma | Legítimo interesse (art. 7º, IX) |
| Exercício regular de direitos em processo judicial ou administrativo | Art. 7º, VI |
| Medir o resultado de campanhas de anúncio | Consentimento (art. 7º, I), revogável a qualquer tempo |
| Envio de novidades e marketing (opcional) | Consentimento (art. 7º, I), revogável a qualquer tempo |
"""


def privacidade(t):
    t = inserir_depois(t, 'exibidos publicamente\npara permitir a escolha', CLIQUES) \
        if 'exibidos publicamente\npara permitir a escolha' in t else \
        inserir_depois(t, 'exibidos publicamente para permitir a escolha', CLIQUES)

    # A tabela de finalidades sai achatada da extração; é remontada inteira.
    i = t.index('## 6.')
    j = t.index('6.1 Em respeito')
    cabeca = t[:i] + '## 6.  FINALIDADES E BASES LEGAIS\n\n' + TABELA_FINALIDADES.strip() + '\n\n'
    t = cabeca + t[j:]

    t = inserir_depois(t, 'Nós não vendemos nem alugamos seus dados', DESTINATARIOS)
    t = inserir_depois(t, '11.3 Imutabilidade e rastreabilidade', RETENCAO)
    t = inserir_depois(t, '12.3 Parte das solicitações pode ser feita', PRAZO_RESPOSTA)
    return t


def adesao(t):
    """Insere o não comparecimento logo DEPOIS da cláusula de repasse e
    cancelamento, que é o assunto ao qual ele pertence.

    Numerado como 4A, e não como 21: inserir no meio renumeraria as dezesseis
    cláusulas seguintes, e toda remissão interna do documento ("nos termos da
    cláusula 14") passaria a apontar para o lugar errado. A letra é a forma
    usual de acrescentar sem mexer no que já está numerado.
    """
    secoes = list(re.finditer(r'^## (\d{1,2})\.\s', t, re.M))
    depois_da_4 = next((s for s in secoes if s.group(1) == '5'), None)
    if not depois_da_4:
        raise SystemExit('não achei a cláusula 5 para ancorar o não comparecimento')
    i = depois_da_4.start()
    return t[:i] + NAO_COMPARECIMENTO.strip() + '\n\n' + t[i:]


TRANSFORMA = {
    'politica-de-privacidade': ('Política de Privacidade e Tratamento de Dados', privacidade),
    'termos-de-servico': ('Termos de Serviço', None),
    'termo-de-adesao-medicos': ('Termo de Adesão — Médicos Parceiros', adesao),
}


def main():
    for slug, (titulo, ajuste) in TRANSFORMA.items():
        bruto = open(os.path.join(PASTA, f'{slug}.txt'), encoding='utf-8').read()
        md = para_markdown(bruto)
        if ajuste:
            md = ajuste(md)
        # A data antiga sai; a nova entra pelo rodapé que o gerador desenha.
        # Sai só o CARIMBO de versão; o que vem depois dele no Termo de Adesão é
        # bloco de assinatura ("Coroaci/MG, data eletrônica do aceite…"), que é
        # cláusula e tem que ficar. A primeira versão desta linha levava os dois
        # juntos e apagava o local e a forma do aceite.
        md = re.sub(r'Última atualização: \d{1,2} de \w+ de \d{4} · aviDoc\s*', '', md)
        md = re.sub(r'Versão vigente: \d{1,2} de \w+ de \d{4}\s*·?\s*', '', md)
        corpo = f'<!-- versao: {VERSAO} -->\n# {titulo}\n\n{md.strip()}\n'
        open(os.path.join(PASTA, f'{slug}.md'), 'w', encoding='utf-8').write(corpo)
        print(f'  {slug:<28} {len(corpo):>6} chars')


if __name__ == '__main__':
    main()
