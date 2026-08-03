import React from 'react';
import { BRAND } from '@/config/brand';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, CalendarCheck, Search } from 'lucide-react';

const NotFoundPage = () => (
  <>
    <Helmet>
      <title>{`Página não encontrada · ${BRAND.name}`}</title>
      <meta name="robots" content="noindex" />
    </Helmet>

    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-md">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-brand-50 flex items-center justify-center mb-6">
          <Search className="w-9 h-9 text-brand-500" />
        </div>
        <p className="text-5xl font-extrabold text-slate-900 tracking-tight">404</p>
        <h1 className="mt-3 text-xl font-bold text-slate-800">Página não encontrada</h1>
        <p className="mt-2 text-slate-500 leading-relaxed">
          O endereço que você tentou acessar não existe ou foi movido. Vamos te levar de volta para agendar sua consulta.
        </p>
        <div className="mt-7 flex flex-col sm:flex-row gap-2 justify-center">
          <Button asChild className="h-11 px-6 rounded-xl">
            <Link to="/agendamentos"><CalendarCheck className="w-4 h-4 mr-2" /> Agendar consulta</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 px-6 rounded-xl border-slate-200">
            <Link to="/"><Home className="w-4 h-4 mr-2" /> Voltar ao início</Link>
          </Button>
        </div>
      </div>
    </div>
  </>
);

export default NotFoundPage;
