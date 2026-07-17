import React from 'react';

// Cabeçalho padrão das telas do dashboard médico — mesma tipografia (Manrope),
// tamanho, ícone azul e espaçamento em todas. Ações à direita via children.
const DoctorPageHeader = ({ icon: Icon, title, subtitle, children }) => (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
            <h1 className="dash-page-title text-2xl flex items-center gap-2">
                {Icon && <Icon className="w-6 h-6 text-primary shrink-0" />}
                {title}
            </h1>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {children && <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div>}
    </div>
);

export default DoctorPageHeader;
