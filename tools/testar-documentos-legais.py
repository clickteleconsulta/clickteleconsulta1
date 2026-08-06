#!/usr/bin/env python3
"""
Trava a substituição de marca dos documentos legais.

POR QUE ESTE TESTE EXISTE
A primeira versão do gerador transformava "clickteleconsulta.online" em
"aviDoc.online" — um domínio inexistente dentro de um documento com efeito
jurídico. O ponto conta como fronteira de palavra, então a regra do NOME casava
com o miolo do DOMÍNIO. Só apareceu porque o relatório de trocas mostrou uma
substituição a menos do que o esperado.

Rode antes de gerar qualquer documento:
    python3 tools/testar-documentos-legais.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib import import_module

aplicar = import_module('gerar-documentos-legais').aplicar_marca

CASOS = [
    ('Acesse clickteleconsulta.online para saber mais.',
     'Acesse avidoc.com.br para saber mais.'),
    ('Escreva para suporte@clickteleconsulta.online.',
     'Escreva para suporte@avidoc.com.br.'),
    ('O site www.clickteleconsulta.com.br pertence à ClickTeleConsulta.',
     'O site avidoc.com.br pertence à aviDoc.'),
    ('A Click Teleconsulta é responsável pelo agendamento.',
     'A aviDoc é responsável pelo agendamento.'),
    # A razão social tem que SOBREVIVER: a empresa não mudou, só o nome comercial.
    ('A CLICK TELECONSULTA ONLINE LTDA, CNPJ 68.171.336/0001-50, declara.',
     'A CLICK TELECONSULTA ONLINE LTDA, CNPJ 68.171.336/0001-50, declara.'),
    # Quebra de linha no meio do nome, que acontece em texto extraído de PDF.
    ('A Click\nTeleconsulta informa.', 'A aviDoc informa.'),
]

falhas = 0
for entrada, esperado in CASOS:
    saida, _ = aplicar(entrada)
    if saida != esperado:
        falhas += 1
        print('  FALHOU')
        print(f'    entrada:  {entrada!r}')
        print(f'    esperado: {esperado!r}')
        print(f'    obtido:   {saida!r}')

print(f'  {len(CASOS) - falhas}/{len(CASOS)} casos passaram')
sys.exit(1 if falhas else 0)
