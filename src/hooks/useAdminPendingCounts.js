import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

// Contadores de pendências operacionais do admin — usados nos badges do menu
// e no painel "Precisa da sua atenção". As queries espelham exatamente a lógica
// de cada tela (Reembolsos, Saques, Profissionais/documentos, Avaliações).
const EMPTY = { reembolsos: 0, saques: 0, documentos: 0, denuncias: 0 };

export function useAdminPendingCounts(pollKey) {
    const [counts, setCounts] = useState(EMPTY);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const [refRes, saqueRes, docRes, denRes] = await Promise.all([
                // Reembolso pendente: guia cancelada + ainda paga + % de reembolso > 0
                supabase.from('agendamentos').select('refund_percent').eq('status', 'cancelado').eq('pagamento_status', 'pago'),
                // Saque aguardando pagamento ao médico
                supabase.from('saques').select('id', { count: 'exact', head: true }).eq('status', 'Aguardando Recebimento'),
                // Documentos de médicos em análise (contados por profissional)
                supabase.from('medico_documentos').select('user_id').eq('status', 'pendente'),
                // Denúncias de avaliações aguardando moderação
                supabase.from('avaliacoes').select('id', { count: 'exact', head: true }).eq('status', 'denunciada'),
            ]);

            const reembolsos = (refRes.data || []).filter(a => (a.refund_percent == null ? 100 : a.refund_percent) > 0).length;
            const documentos = new Set((docRes.data || []).map(d => d.user_id)).size;

            setCounts({
                reembolsos,
                saques: saqueRes.count || 0,
                documentos,
                denuncias: denRes.count || 0,
            });
        } catch {
            // Silencioso: badges nunca devem quebrar o layout.
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { refresh(); }, [refresh, pollKey]);

    const total = counts.reembolsos + counts.saques + counts.documentos + counts.denuncias;
    return { counts, loading, refresh, total };
}
