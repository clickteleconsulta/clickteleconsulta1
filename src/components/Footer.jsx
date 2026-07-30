import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Stethoscope, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-50 border-t border-slate-200 mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Marca */}
          <div className="sm:col-span-2 lg:col-span-1 space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <Logo className="w-9 h-9" />
              <span className="text-lg font-bold text-slate-900">Click Teleconsulta</span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
              Agende teleconsultas com profissionais — rápido, seguro e acessível.
            </p>
            <Link to="/acesso-profissional" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors group">
              <Stethoscope className="w-4 h-4 text-blue-500" /> Acesso Sistema Profissionais
              <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Link>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <p className="font-semibold text-slate-900 text-sm">Legal</p>
            <nav className="flex flex-col gap-2.5">
              <Link to="/legal?doc=terms_of_service" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">Termos de Serviço</Link>
              <Link to="/legal?doc=privacy_policy" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">Política de Privacidade (LGPD)</Link>
            </nav>
          </div>

          {/* Acesso */}
          <div className="space-y-4">
            <p className="font-semibold text-slate-900 text-sm">Acesso</p>
            <nav className="flex flex-col gap-2.5">
              <Link to="/agendamentos" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">Agendar Consulta</Link>
              <Link to="/quem-somos" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">Quem somos</Link>
              <Link to="/como-funciona" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">Como funciona</Link>
              <Link to="/perguntas-frequentes" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">Perguntas frequentes</Link>
              <Link to="/blog" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">Blog</Link>
              <Link to="/acesso-cliente" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">Entrar</Link>
            </nav>
          </div>

          {/* Contato */}
          <div className="space-y-4">
            <p className="font-semibold text-slate-900 text-sm">Contato e Suporte</p>
            <div className="flex flex-col gap-1.5 text-sm text-slate-500">
              <a href="mailto:suporte@clickteleconsulta.online" className="hover:text-blue-600 transition-colors break-all">suporte@clickteleconsulta.online</a>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild className="gap-2 h-9 border-slate-200 hover:bg-blue-50 hover:border-blue-200 text-slate-600 hover:text-blue-600 text-xs">
                <a href="mailto:suporte@clickteleconsulta.online"><Mail className="w-3.5 h-3.5" /> Email</a>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 space-y-2 text-xs text-slate-400">
          <p className="leading-relaxed">
            A Click Teleconsulta é um <strong className="text-slate-500">marketplace de agendamentos</strong>: fazemos apenas a intermediação do agendamento e do pagamento entre pacientes e médicos. <strong className="text-slate-500">Não somos uma plataforma de teleconsulta</strong> — a teleconsulta e o ato médico são de responsabilidade exclusiva do profissional que realiza o atendimento. Pague somente quando usar, sem assinaturas ou mensalidades; não trabalhamos com planos de saúde, apenas atendimentos particulares avulsos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
            <p>&copy; {year} Click Teleconsulta. Todos os direitos reservados.</p>
          </div>
          <p className="leading-relaxed">
            CLICK TELECONSULTA ONLINE LTDA · CNPJ 68.171.336/0001-50 · R. Antônio Pereira Ramos, nº 118, Centro, Coroaci/MG, CEP 39.710-000
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
