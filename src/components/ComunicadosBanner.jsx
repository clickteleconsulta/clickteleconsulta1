import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Info, AlertTriangle, CheckCircle2, X } from 'lucide-react';

const STORAGE_KEY = 'comunicados_lidos';
const readDismissed = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
};

const STYLES = {
    info: { wrap: 'bg-blue-50 border-blue-200 text-blue-900', icon: Info, iconCls: 'text-blue-600' },
    alerta: { wrap: 'bg-amber-50 border-amber-200 text-amber-900', icon: AlertTriangle, iconCls: 'text-amber-600' },
    sucesso: { wrap: 'bg-emerald-50 border-emerald-200 text-emerald-900', icon: CheckCircle2, iconCls: 'text-emerald-600' },
};

// Exibe comunicados ativos do admin direcionados ao público do usuário.
// A dispensa é por dispositivo (localStorage) para não exigir tabela de leitura.
const ComunicadosBanner = ({ audience }) => {
    const [items, setItems] = useState([]);
    const [dismissed, setDismissed] = useState(readDismissed);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const { data } = await supabase
                    .from('comunicados')
                    .select('id, titulo, mensagem, tipo, created_at')
                    .eq('ativo', true)
                    .in('publico', ['todos', audience])
                    .order('created_at', { ascending: false });
                if (alive) setItems(data || []);
            } catch {
                /* silencioso */
            }
        })();
        return () => { alive = false; };
    }, [audience]);

    const dismiss = (id) => {
        const next = [...new Set([...dismissed, id])];
        setDismissed(next);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    };

    const visible = items.filter((c) => !dismissed.includes(c.id));
    if (visible.length === 0) return null;

    return (
        <div className="space-y-3 mb-6">
            {visible.map((c) => {
                const s = STYLES[c.tipo] || STYLES.info;
                const Icon = s.icon;
                return (
                    <div key={c.id} className={`flex items-start gap-3 p-4 rounded-xl border ${s.wrap}`}>
                        <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${s.iconCls}`} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">{c.titulo}</p>
                            <p className="text-sm opacity-90 mt-0.5 whitespace-pre-line">{c.mensagem}</p>
                        </div>
                        <button onClick={() => dismiss(c.id)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity" aria-label="Dispensar">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default ComunicadosBanner;
