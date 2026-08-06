#!/usr/bin/env python3
"""
Confere, palavra por palavra, o que mudou do documento vigente para a v1.1.

POR QUE ISTO EXISTE
Eu troquei o título do Termo de Adesão por uma versão encurtada que escrevi de
cabeça própria, e derrubei o subtítulo dos três — sem que nenhum teste acusasse.
O teste que eu tinha comparava FRASES do original com o novo, então percebia
remoção, mas não percebia SUBSTITUIÇÃO: o título antigo sumia da lista de frases
preservadas junto com o cabeçalho, que era esperado sumir, e o novo passava
despercebido no meio.

Este confere nos dois sentidos e classifica cada diferença. O que não estiver
declarado como acréscimo autorizado aparece como ALTERAÇÃO NÃO AUTORIZADA — e
é para dar erro.

Uso:
    python3 tools/conferir-v11.py
"""
import difflib
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASTA = os.path.join(RAIZ, 'documentos-legais')

# Trechos que o gerador legitimamente REMOVE do corpo, porque os redesenha:
# wordmark do cabeçalho, rodapé institucional e o carimbo de versão antigo.
# Os padrões casam o texto JÁ TOKENIZADO, onde o "·" some — por isso
# "LTDA CNPJ" e não "LTDA · CNPJ". Errar isso faz uma remoção legítima aparecer
# como problema, e o ruído treina a pessoa a ignorar o relatório.
REMOCOES_OK = [
    r'^avi Doc$',
    r'^000$',
    r'^CLICK TELECONSULTA ONLINE LTDA CNPJ [\d./-]+ R\. Antônio Pereira Ramos',
    r'^aviDoc é o nome comercial',
    r'^Última atualização: \d{1,2} de \w+ de \d{4}',
    r'^Versão vigente: \d{1,2} de \w+ de \d{4}',
    # Contraparte do acréscimo declarado abaixo: a palavra sai da posição em que
    # a extração a deixou (depois da segunda coluna) e reaparece dentro da
    # própria célula. Some de um lugar e nasce em outro — daí precisar constar
    # nas duas listas.
    r'^regulatórias$',
]

# Marcas do texto NOVO autorizado. Uma inserção só passa se contiver uma delas.
ACRESCIMOS_OK = [
    'De publicidade (coletados automaticamente)',
    'Plataformas de publicidade e medição',
    'Provedor de proteção contra automação',
    '11.4 Prazos de retenção',
    '12.4 Prazo de resposta',
    '12.5 Decisões automatizadas',
    'DO NÃO COMPARECIMENTO DO PACIENTE',
    '4A.1', '4A.2', '4A.3',
    # A tabela de finalidades é remontada; suas linhas voltam como células.
    'Finalidade', 'Base legal (LGPD)', 'Medir o resultado de campanhas de anúncio',
    # A célula "Emitir documentos fiscais e cumprir obrigações legais e
    # regulatórias" quebra de linha no PDF, e a extração intercala a última
    # palavra depois do texto da SEGUNDA coluna. Na tabela remontada ela volta
    # para o fim da própria célula — a palavra muda de posição porque a versão
    # nova está certa, não porque algo se perdeu.
    'regulatórias',
]


def palavras(t):
    t = re.sub(r'`', '', t)
    return re.findall(r'[\wÁÂÃÀÉÊÍÓÔÕÚÇáâãàéêíóôõúç0-9º°ª/§.,;:()\-—–"\']+', t)


def conferir(slug):
    orig = open(os.path.join(PASTA, f'{slug}.txt'), encoding='utf-8').read()
    novo = open(os.path.join(PASTA, f'{slug}.md'), encoding='utf-8').read()
    novo = re.sub(r'<!--.*?-->', '', novo, flags=re.S)
    novo = re.sub(r'^[#>|\-]+\s*', '', novo, flags=re.M)

    a, b = palavras(orig), palavras(novo)
    problemas = []
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag == 'equal':
            continue
        saiu = ' '.join(a[i1:i2])
        entrou = ' '.join(b[j1:j2])
        if tag == 'delete' and any(re.search(p, saiu.strip()) for p in REMOCOES_OK):
            continue
        if tag == 'insert' and any(m in entrou for m in ACRESCIMOS_OK):
            continue
        if tag == 'replace':
            # Substituição só passa se o que entrou for acréscimo autorizado E o
            # que saiu for remoção autorizada. Foi exatamente aqui que o título
            # trocado escapou da primeira vez.
            ok_saiu = any(re.search(p, saiu.strip()) for p in REMOCOES_OK)
            ok_entrou = any(m in entrou for m in ACRESCIMOS_OK)
            if ok_saiu and ok_entrou:
                continue
        problemas.append((tag, saiu, entrou))
    return problemas


def main():
    total = 0
    for slug in ('politica-de-privacidade', 'termos-de-servico', 'termo-de-adesao-medicos'):
        p = conferir(slug)
        total += len(p)
        print(f'  {slug:<28} {len(p)} diferença(s) não declarada(s)')
        for tag, saiu, entrou in p[:12]:
            if saiu:
                print(f'      SAIU:   {saiu[:110]}')
            if entrou:
                print(f'      ENTROU: {entrou[:110]}')
            print()
    if total:
        print(f'\n  {total} diferenças precisam ser explicadas ou desfeitas.')
    else:
        print('\n  Nenhuma alteração além dos acréscimos autorizados.')
    sys.exit(1 if total else 0)


if __name__ == '__main__':
    main()
