import React from 'react';

// Cabeçalho padrão das páginas do dashboard admin — mesma tipografia (Manrope),
// tamanho, ícone azul e espaçamento em todas as telas. Ações à direita via children.
const AdminPageHeader = ({ icon: Icon, title, subtitle, children }) => (
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
            <h2 className="dash-page-title text-3xl flex items-center gap-2">
                {Icon && <Icon className="w-7 h-7 text-primary shrink-0" />}
                {title}
            </h2>
            {subtitle && <p className="text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {children && <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div>}
    </div>
);

export default AdminPageHeader;
