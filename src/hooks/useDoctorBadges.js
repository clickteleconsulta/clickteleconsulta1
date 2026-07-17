import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';

const TZ = 'America/Sao_Paulo';
const EMPTY = { hoje: 0, denuncias: 0 };
const ATIVAS = ['confirmado', 'pendente', 'reagendado', 'agendado'];

// Contadores para os badges do menu do médico:
// hoje = consultas agendadas para hoje · denuncias = avaliações denunciadas.
// (Financeiro não tem badge: saldo é estado permanente, não alerta acionável.)
export function useDoctorBadges(pollKey) {
    const { session } = useAuth();
    const [badges, setBadges] = useState(EMPTY);

    const refresh = useCallback(async () => {
        const uid = session?.user?.id;
        if (!uid) return;
        try {
            const { data: med } = await supabase.from('medicos').select('id').eq('user_id', uid).maybeSingle();
            const docId = med?.id;

            const todayStr = format(utcToZonedTime(new Date(), TZ), 'yyyy-MM-dd');
            const start = zonedTimeToUtc(`${todayStr} 00:00:00`, TZ).toISOString();
            const end = zonedTimeToUtc(`${todayStr} 23:59:59`, TZ).toISOString();

            const [agRes, denRes] = await Promise.all([
                docId
                    ? supabase.from('agendamentos').select('id', { count: 'exact', head: true })
                        .eq('medico_id', docId).gte('horario_inicio', start).lte('horario_inicio', end).in('status', ATIVAS)
                    : Promise.resolve({ count: 0 }),
                supabase.from('avaliacoes').select('id', { count: 'exact', head: true }).eq('medico_id', uid).eq('status', 'denunciada'),
            ]);

            setBadges({ hoje: agRes.count || 0, denuncias: denRes.count || 0 });
        } catch {
            /* silencioso — badges nunca quebram o layout */
        }
    }, [session?.user?.id]);

    useEffect(() => { refresh(); }, [refresh, pollKey]);

    return badges;
}
