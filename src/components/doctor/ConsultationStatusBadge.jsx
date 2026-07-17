import React from 'react';
import { CheckCircle2, AlertTriangle, Clock, Check, XCircle } from 'lucide-react';

// Badge de status de consulta — cores semânticas consistentes em todas as telas
// (Consultas, Painel, etc.). size="sm" para uso compacto.
const CONFIG = {
    confirmado: { label: 'Confirmado', icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    agendado: { label: 'Confirmado', icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    pendente: { label: 'Pendente', icon: AlertTriangle, cls: 'bg-amber-50 text-amber-700 border-amber-100' },
    reagendado: { label: 'Reagendado', icon: Clock, cls: 'bg-amber-50 text-amber-700 border-amber-100' },
    atendido: { label: 'Concluído', icon: Check, cls: 'bg-blue-50 text-blue-700 border-blue-100' },
    concluida: { label: 'Concluído', icon: Check, cls: 'bg-blue-50 text-blue-700 border-blue-100' },
    cancelado: { label: 'Cancelado', icon: XCircle, cls: 'bg-red-50 text-red-700 border-red-100' },
    expirado: { label: 'Expirado', icon: XCircle, cls: 'bg-red-50 text-red-700 border-red-100' },
};

const ConsultationStatusBadge = ({ status, size = 'md' }) => {
    const c = CONFIG[status] || { label: status || '—', icon: null, cls: 'bg-gray-50 text-gray-600 border-gray-100' };
    const Icon = c.icon;
    const sizeCls = size === 'sm'
        ? 'px-2 py-0.5 text-[10px]'
        : 'px-2.5 py-1 text-[10px]';
    const iconSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';
    return (
        <span className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider border shadow-sm ${sizeCls} ${c.cls}`}>
            {Icon && <Icon className={iconSize} />}{c.label}
        </span>
    );
};

export default ConsultationStatusBadge;
