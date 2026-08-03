import { jsPDF } from 'jspdf';
import { BRAND, LINHA_LEGAL } from '@/config/brand';

// Gera a Guia de Agendamento em PDF no próprio navegador (sem depender do backend).
// Recebe um objeto normalizado; campos ausentes são omitidos com segurança.
// Posicionamento de marketplace: a plataforma intermedia o agendamento; o médico realiza o atendimento.
export function gerarGuiaPdf({
  protocolo,
  doctorName,
  specialty,
  whenLabel,
  patientName,
  priceLabel,
  geradoEm,
} = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  const COBALTO = [59, 91, 165];
  const SLATE = [71, 85, 105];
  const DARK = [15, 23, 42];

  // Cabeçalho institucional
  doc.setFillColor(...COBALTO);
  doc.rect(0, 0, W, 96, 'F');

  // Ícone da marca invertido: quadrado branco com a cápsula inclinada em cobalto.
  // Uma cápsula é geometricamente um traço grosso de pontas redondas — desenhá-la
  // assim é o que permite inclinar sem precisar de matriz de transformação.
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(M, 28, 40, 40, 9, 9, 'F');
  doc.setDrawColor(...COBALTO);
  doc.setLineWidth(13);
  doc.setLineCap('round');
  doc.line(M + 7.9, 52.9, M + 32.1, 43.1);

  const tx = M + 54;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(BRAND.name, tx, 46);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Guia de Agendamento de Teleconsulta', tx, 68);

  // Protocolo
  let y = 140;
  doc.setTextColor(...SLATE);
  doc.setFontSize(10);
  doc.text('PROTOCOLO', M, y);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(String(protocolo || '—'), M, y + 22);

  // Detalhes
  y += 64;
  const rows = [
    ['Paciente', patientName],
    ['Profissional', doctorName],
    ['Especialidade', specialty],
    ['Data e horário', whenLabel],
    ['Valor', priceLabel],
  ].filter(([, v]) => v);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...SLATE);
    doc.text(String(label).toUpperCase(), M, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    doc.text(String(value), M, y + 18);
    doc.line(M, y + 30, W - M, y + 30);
    y += 48;
  });

  // Nota de marketplace
  y += 12;
  doc.setFillColor(242, 245, 251);
  doc.roundedRect(M, y, W - M * 2, 92, 8, 8, 'F');
  doc.setTextColor(...SLATE);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const nota = doc.splitTextToSize(
    `A ${BRAND.name} é um marketplace de agendamentos: intermedia o agendamento e o pagamento entre paciente e médico. A teleconsulta e o ato médico são de responsabilidade exclusiva do profissional, que entrará em contato para realizar o atendimento pelos meios próprios, conforme as normas do CFM.`,
    W - M * 2 - 28
  );
  doc.text(nota, M + 14, y + 24);

  // Rodapé
  const H = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240);
  doc.line(M, H - 70, W - M, H - 70);
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.text(`${LINHA_LEGAL} · ${BRAND.domain}`, M, H - 52);
  if (geradoEm) doc.text(`Emitida em ${geradoEm}`, M, H - 38);

  const nome = protocolo ? `guia-${String(protocolo).replace(/[^\w-]/g, '')}.pdf` : 'guia-agendamento.pdf';
  doc.save(nome);
}
