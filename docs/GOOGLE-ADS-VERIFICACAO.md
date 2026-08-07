# aviDoc — Google Ads: Verificação e Certificação

**Correção e guia operacional.** Documento de referência do projeto.

---

## 1. São duas coisas diferentes

Nas versões anteriores eu tratei como um processo único. São dois, com naturezas opostas:

| | **Verificação do Anunciante** | **Certificação de Saúde** |
|---|---|---|
| Quem precisa | **Todos os anunciantes** | Só categorias específicas |
| Quando | Proativa — faça agora | **Acionada** pelo Google |
| Natureza | Identidade da empresa | Licenciamento do serviço |
| Documentos | CNPJ, contrato social, endereço | Alvará sanitário, CRM, responsável técnico |
| Vocês precisam? | ✅ **Sim, obrigatório** | ⚠️ Depende do que anunciarem |

**A ação imediata é a verificação do anunciante, não a certificação de saúde.**

---

## 2. Verificação do Anunciante (faça esta semana)

Onde: **Faturamento → Verificação do anunciante → Iniciar tarefa**.

Documentos típicos para pessoa jurídica no Brasil:
- Cartão CNPJ ativo da CLICK TELECONSULTA ONLINE LTDA
- Contrato social
- Comprovante de endereço da empresa
- Documento do representante legal

⚠️ **Os dados precisam bater exatamente com o perfil de pagamentos** — razão social, CNPJ e endereço idênticos. Divergência é a causa mais comum de reprovação.

Um detalhe do formulário que interessa a vocês: o Google pede <cite index="9-1">licenças necessárias para operar a empresa, caso o anunciante esteja em setor que exija registro — e saúde é citada explicitamente</cite>. É aqui que o modelo de marketplace precisa de atenção.

---

## 3. Certificação de Saúde: quando é exigida

A certificação de saúde existe para categorias específicas: <cite index="4-1">farmácia on-line, serviços de reabilitação de drogas e álcool, telemedicina, seguros e planos de saúde e fabricantes de produtos farmacêuticos</cite>.

E ela **não é um processo que você inicia por vontade própria.** <cite index="14-1">É acionada quando você tenta anunciar categoria que o Google identifica como restrita, ou quando a revisão automática detecta conteúdo de saúde sensível nos anúncios ou na landing page</cite>.

### O que realmente dispara a categoria "telemedicina"

Aqui está o ponto que muda o plano de palavras-chave:

> <cite index="5-1">O Google restringe a promoção de serviços relacionados à prescrição, distribuição e venda on-line de medicamentos controlados. As empresas sujeitas a essa política incluem, entre outras, farmácias on-line e provedores de telemedicina. Os anunciantes precisam ser certificados pelo Google para veicular esses anúncios.</cite>

E <cite index="10-1">o Brasil está na lista de locais em que essa certificação é exigida</cite>.

**Ou seja: o gatilho não é "teleconsulta". É prescrição de medicamento.**

### LegitScript: provavelmente não se aplica

<cite index="3-1">No Brasil, o LegitScript é exigido principalmente para farmácias on-line com venda e entrega de medicamentos, serviços de reabilitação de dependência química e telemedicina com prescrição e envio de medicamentos. Para a maioria das clínicas médicas brasileiras não é obrigatório — o requisito mais comum é a verificação de saúde nativa do Google Ads.</cite>

**A aviDoc não vende nem entrega medicamento.** Vocês intermediam agendamento; a prescrição, quando ocorre, é ato do médico e o paciente compra o remédio onde quiser. Isso deve manter vocês fora do LegitScript.

---

## 4. 🚩 O problema específico do modelo marketplace

Este é o ponto que a sua pergunta acerta em cheio.

Se o Google acionar a verificação de saúde, os documentos usualmente pedidos são <cite index="14-1">CNPJ ativo, alvará sanitário da Vigilância Sanitária, registro do responsável técnico no conselho de classe (CRM) e comprovante de endereço da clínica</cite>.

**A CLICK TELECONSULTA ONLINE LTDA não tem nenhum deles.** Ela é tratamento de dados e produção de software. Não tem CNAE de saúde, não tem alvará sanitário, não tem diretor técnico médico — e nem deveria ter, porque não presta ato médico.

### As três saídas, em ordem de preferência

**1. Anunciar como plataforma de intermediação, não como prestador** ✅ *recomendada*

A landing page precisa deixar explícito, acima da dobra, que:
- A aviDoc é plataforma de **agendamento**
- O atendimento é realizado por **médicos independentes, com CRM identificado**
- A CLICK não presta serviço médico

Vocês já fazem isso parcialmente — as páginas de médico exibem CRM. **Reforcem.** Se a revisão automática entender que quem presta o serviço é o médico registrado e não a plataforma, o pedido de alvará não deveria vir.

**2. Se a verificação vier assim mesmo, responda com o conjunto correto**

Monte a pasta antes de precisar dela:
- CNPJ da CLICK + contrato social
- **Contrato de intermediação** entre a CLICK e o CNPJ médico
- CNPJ médico + alvará sanitário + CRM dos responsáveis
- Relação dos profissionais com CRM e especialidade

O argumento: a plataforma intermedeia, os prestadores são licenciados, e aqui está a documentação deles.

**3. Anunciar pela conta do CNPJ médico** ⚠️ *só se as duas anteriores falharem*

Tem as credenciais de saúde, mas cria descasamento entre anunciante e domínio (o site é da CLICK). O Google verifica essa correspondência. Use só como último recurso, e com o contrato de intermediação em mãos.

---

## 5. ⚠️ Correção importante no plano de palavras-chave

Nas versões anteriores eu recomendei comprar **"receita médica online"** e **"renovar receita online"** como grupo central. **Revejo essa recomendação.**

Esses termos são o gatilho mais provável da política de medicamentos sob prescrição — exatamente a categoria que exige certificação no Brasil e que a CLICK teria dificuldade de obter.

### Plano revisado

| Prioridade | Grupo | Exemplos | Risco |
|---|---|---|---|
| 1 | **Marca** | "avidoc" | 🟢 Nenhum |
| 2 | **Atestado** | "atestado médico online", "atestado médico pela internet" | 🟢 Baixo |
| 3 | **Consulta/urgência** | "consulta médica online", "médico online agora", "teleconsulta hoje" | 🟢 Baixo |
| 4 | **Preço** | "consulta médica online barata" | 🟢 Baixo |
| 5 | **Receita** | "renovar receita online", "receita médica online" | 🔴 **Alto** |

**Regra de contenção:** rode os grupos 1 a 4 primeiro e só depois teste o grupo 5 — **em campanha separada**. Se ele for reprovado, o problema fica isolado e não contamina o histórico da conta.

Reprovações acumuladas em saúde geram histórico negativo e risco de suspensão. Isolar o grupo arriscado é barato; recuperar conta suspensa não é.

**Na landing page:** descreva o que o médico pode emitir sem transformar isso em oferta de medicamento. "O médico avalia e, se for o caso, emite atestado, receita ou pedido de exame com assinatura digital válida" é seguro. "Receita online rápida" não é.

---

## 6. O que fazer, em ordem

**Esta semana**
1. Iniciar **Verificação do Anunciante** com os dados da CLICK — obrigatório e independente de tudo
2. Reforçar na landing que a aviDoc **intermedeia** e que o atendimento é de médicos com CRM
3. Montar a pasta de documentos da saída 2 (contrato de intermediação, alvará e CRM do lado médico) — antes de precisar

**Ao ligar a campanha**
4. Subir só os grupos 1 a 4
5. Deixar "receita" para campanha separada, depois
6. Monitorar a **Central de Políticas** (Ferramentas e Configurações → Central de Políticas) — é lá que aparece qualquer pedido de verificação

**Se a certificação for acionada**
7. Responder pela categoria correta. <cite index="4-1">O Google orienta a não se inscrever em categoria que não corresponda ao modelo de negócio</cite> — a aviDoc é intermediação de agendamento, não farmácia nem provedor de medicamento
8. Se pedirem certificação de telemedicina para medicamentos, avaliar se vale, dado que vocês não vendem medicamento

---

## 7. Resumo

- **Verificação do anunciante: obrigatória, faça agora.** CNPJ, contrato social, endereço da CLICK.
- **Certificação de saúde: não é pré-requisito.** É acionada, e o gatilho principal é prescrição de medicamento — não teleconsulta.
- **Alvará sanitário provavelmente não se aplica à CLICK**, porque ela não presta ato médico. Eu superestimei isso antes.
- **O risco real é de enquadramento**: se o Google entender a aviDoc como prestadora e não como intermediadora, vai pedir documento que ela não tem. A defesa é a landing page e o contrato de intermediação.
- **Tirem "receita" do primeiro lote de palavras-chave.** É o gatilho mais provável da categoria restrita.

Nada disso deve travar o lançamento. Só muda a ordem: verificação do anunciante agora, campanha com termos seguros, e o grupo de receita isolado para depois.
