-- ============================================================
-- Aviso de novo agendamento ao médico por WhatsApp
-- Rodar uma vez no SQL Editor do Supabase.
-- ============================================================
--
-- Isto aqui é UMA trava, não uma tabela nova. O registro do envio já vive em
-- agendamento_logs; o que falta é garantir que ele seja ÚNICO por agendamento.
--
-- Por que a trava é no banco e não só no código: a função confere se já existe
-- log antes de enviar, mas conferir-e-depois-inserir tem uma janela. Se o
-- webhook do Asaas reentregar o evento no mesmo segundo, as duas execuções leem
-- "ainda não enviado" e o médico recebe a mesma consulta duas vezes. Com o
-- índice, a segunda tentativa esbarra em 23505 e a função trata isso como
-- "outro já avisou".
--
-- É índice PARCIAL: vale só para a ação de envio bem-sucedido. As outras ações
-- do mesmo agendamento (falha, telefone ausente, pagamento confirmado) podem
-- repetir à vontade, que é o que se espera de um histórico.

CREATE UNIQUE INDEX IF NOT EXISTS agendamento_logs_whatsapp_medico_unico
  ON agendamento_logs (agendamento_id)
  WHERE acao = 'whatsapp_medico_enviado';

-- Conferência: deve listar o índice acima.
-- SELECT indexname FROM pg_indexes
--  WHERE tablename = 'agendamento_logs'
--    AND indexname = 'agendamento_logs_whatsapp_medico_unico';

-- ------------------------------------------------------------
-- Diagnóstico do dia a dia
-- ------------------------------------------------------------
-- Médicos que perderam aviso por não ter WhatsApp no cadastro:
--
--   SELECT l.created_at, l.agendamento_id, l.dados
--     FROM agendamento_logs l
--    WHERE l.acao = 'whatsapp_medico_sem_telefone'
--    ORDER BY l.created_at DESC
--    LIMIT 50;
--
-- Envios que a Meta recusou (o campo `detalhe` traz o código dela):
--
--   SELECT l.created_at, l.agendamento_id, l.dados->>'detalhe' AS erro
--     FROM agendamento_logs l
--    WHERE l.acao = 'whatsapp_medico_falhou'
--    ORDER BY l.created_at DESC
--    LIMIT 50;
--
-- Pagos que NÃO geraram aviso nenhum (nem sucesso, nem falha registrada) —
-- é aqui que aparece qualquer buraco no gatilho:
--
--   SELECT a.id, a.protocolo, a.pagamento_confirmado_em
--     FROM agendamentos a
--    WHERE a.pagamento_status = 'pago'
--      AND a.pagamento_confirmado_em > now() - interval '7 days'
--      AND NOT EXISTS (
--            SELECT 1 FROM agendamento_logs l
--             WHERE l.agendamento_id = a.id
--               AND l.acao LIKE 'whatsapp_medico_%')
--    ORDER BY a.pagamento_confirmado_em DESC;
