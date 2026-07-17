// Geração de CSV compatível com Excel PT-BR:
// - delimitador ';' (padrão do Excel em português)
// - BOM UTF-8 para acentuação correta
// - quebras \r\n e escape de aspas
// columns: [{ header: string, value: (row) => any }]

const escapeCell = (val) => {
    if (val == null) return '';
    const s = String(val);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Número no formato brasileiro (vírgula decimal), sem símbolo de moeda.
export const brNumber = (n) => (Number(n) || 0).toFixed(2).replace('.', ',');

// Sufixo de data para o nome do arquivo (ex.: 2026-07-17).
export const csvDateSuffix = () => new Date().toISOString().slice(0, 10);

export function downloadCsv(filename, columns, rows) {
    const header = columns.map((c) => escapeCell(c.header)).join(';');
    const body = (rows || []).map((row) => columns.map((c) => escapeCell(c.value(row))).join(';')).join('\r\n');
    const csv = '﻿' + header + (body ? '\r\n' + body : '');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
