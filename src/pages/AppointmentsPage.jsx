
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { BRAND } from '@/config/brand';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { patientPriceFromRepasse } from '@/lib/price';
import { PUBLIC_DOCTOR_COLUMNS } from '@/lib/publicDoctorColumns';
import { nextAvailableSlotMs } from '@/lib/doctorAvailability';
import { DoctorScheduleCard } from '@/components/DoctorScheduleCard';
import { Loader2, Frown, Edit, Search, Filter, X } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DoctorSchedule from '@/components/doctor/DoctorSchedule';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import useAsync from '@/hooks/useAsync';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseISO, getDay } from 'date-fns';

/**
 * Pré-visualização das estrelas de avaliação — SÓ EM DESENVOLVIMENTO.
 *
 * Nenhum médico tem avaliação ainda, então o bloco de estrelas do card nunca
 * aparece e não dá para julgar o desenho. Isto injeta notas de mentira para a
 * revisão visual, e nada mais: não escreve no banco, não altera nenhuma
 * consulta e não muda o que o paciente vê.
 *
 * DUAS TRAVAS, porque um dado de avaliação falso num site de saúde seria grave:
 *
 *   1. `import.meta.env.DEV` é substituído por `false` no build do Vite, então
 *      esta função inteira sai do bundle publicado por eliminação de código
 *      morto — não é uma checagem em tempo de execução que alguém possa burlar.
 *   2. Mesmo em desenvolvimento, só responde com `?avaliacoes=teste` na URL.
 *
 * Uso: http://localhost:3000/agendamentos?avaliacoes=teste
 *
 * As amostras são distribuídas pela POSIÇÃO na lista, não por um hash do id:
 * hash de UUID colidia e os cards saíam todos com a mesma nota, que era
 * justamente o que a pré-visualização precisa evitar. Por posição, aparecem as
 * cinco variações de uma vez — nota cheia e quebrada, e contagem de um, dois e
 * três dígitos, para conferir o alinhamento em todas.
 */
const AMOSTRAS = [
  { rating: 5.0, reviewCount: 3 },
  { rating: 4.8, reviewCount: 47 },
  { rating: 4.2, reviewCount: 128 },
  { rating: 3.6, reviewCount: 9 },
  { rating: 2.9, reviewCount: 214 },
];

const avaliacoesDeTeste = () =>
  import.meta.env.DEV
  && typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('avaliacoes') === 'teste';

const amostraDeAvaliacao = (indice) =>
  (avaliacoesDeTeste() ? AMOSTRAS[indice % AMOSTRAS.length] : null);

const AppointmentsPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [specialties, setSpecialties] = useState([]);

  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [priceSort, setPriceSort] = useState('');
  const [searchName, setSearchName] = useState(searchParams.get('q') || '');
  const [doctorPrices, setDoctorPrices] = useState({});

  const [activeFilters, setActiveFilters] = useState({
    specialty: '',
    date: '',
    priceSort: ''
  });

  // Paginação: mostra 5 por vez e carrega mais sob demanda.
  const [visibleCount, setVisibleCount] = useState(5);
  // Barra de filtros retrátil (recolhe ao rolar para baixo, reaparece ao subir).
  const [hideFilters, setHideFilters] = useState(false);

  useEffect(() => { setVisibleCount(5); }, [activeFilters]);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 120) setHideFilters(false);
      else if (y > lastY + 6) setHideFilters(true);
      else if (y < lastY - 6) setHideFilters(false);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const formatPrice = (value) => {
    if (value === undefined || value === null) return null;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const fetchPublicDoctors = useCallback(async () => {
    const { data: publicDoctors, error: fetchError } = await supabase
      .from('medicos')
      .select(`${PUBLIC_DOCTOR_COLUMNS}, agenda_medico(*), procedimentos(*)`)
      .eq('is_public', true)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching doctors:', fetchError);
      throw new Error("Não foi possível buscar os dados dos médicos. Tente novamente.");
    }

    // Notas reais: média + contagem de avaliações publicadas por médico (medico_id = user_id).
    const userIds = (publicDoctors || []).map(d => d.user_id).filter(Boolean);
    const ratingsByUser = {};
    if (userIds.length) {
      const { data: revs } = await supabase
        .from('avaliacoes')
        .select('medico_id, rating')
        .eq('status', 'publicada')
        .in('medico_id', userIds);
      const agg = {};
      (revs || []).forEach(r => {
        if (r.rating == null) return;
        (agg[r.medico_id] = agg[r.medico_id] || { sum: 0, n: 0 });
        agg[r.medico_id].sum += Number(r.rating);
        agg[r.medico_id].n += 1;
      });
      Object.keys(agg).forEach(uid => {
        ratingsByUser[uid] = { rating: agg[uid].sum / agg[uid].n, reviewCount: agg[uid].n };
      });
    }

    const newDoctorPrices = {};

    const processedDoctors = (publicDoctors || []).map((doc, indice) => {
      const taxaPercentual = doc.payment_settings?.platform_fee_percent || 0;
      const mainProc = doc.procedimentos?.find(p => p.principal);
      const precoRepasse = mainProc ? Number(mainProc.preco) : (Number(doc.price_in_cents) / 100 || 0);
      // Preço paciente: aplica a taxa e arredonda para cima ao próximo R$ 0,50 (sem valor quebrado).
      const precoFinal = patientPriceFromRepasse(precoRepasse, taxaPercentual);
      newDoctorPrices[doc.id] = precoFinal;
      const r = ratingsByUser[doc.user_id];
      const notas = r || amostraDeAvaliacao(indice);
      return {
        ...doc,
        price_in_cents: Math.round(precoFinal * 100),
        rating: notas ? notas.rating : 0,
        reviewCount: notas ? notas.reviewCount : 0,
      };
    });

    // Próximo horário disponível de cada médico (para ranking por proximidade).
    // Uma única consulta traz os horários já reservados (pagos) de todos os médicos.
    const doctorIds = processedDoctors.map((d) => d.id);
    const bookedByDoctor = {};
    if (doctorIds.length) {
      const { data: booked } = await supabase
        .from('agendamentos')
        .select('medico_id, horario_inicio')
        .in('medico_id', doctorIds)
        .eq('pagamento_status', 'pago')
        .not('status', 'in', '(cancelado,expirado,expirado_pagamento)')
        .gte('horario_inicio', new Date().toISOString());
      (booked || []).forEach((b) => {
        if (!b.horario_inicio) return;
        (bookedByDoctor[b.medico_id] ||= new Set()).add(new Date(b.horario_inicio).getTime());
      });
    }
    // Bloqueios (indisponibilidade) de cada médico — também escondem horários no ranking.
    const blocksByDoctor = {};
    if (doctorIds.length) {
      const { data: blk } = await supabase
        .from('bloqueios_agenda')
        .select('medico_id, inicio, fim')
        .in('medico_id', doctorIds)
        .gte('fim', new Date().toISOString());
      (blk || []).forEach((b) => {
        (blocksByDoctor[b.medico_id] ||= []).push({ inicio: new Date(b.inicio).getTime(), fim: new Date(b.fim).getTime() });
      });
    }
    processedDoctors.forEach((d) => {
      d.nextSlotMs = nextAvailableSlotMs(d.agenda_medico, bookedByDoctor[d.id], blocksByDoctor[d.id]);
    });

    setDoctorPrices(newDoctorPrices);
    return processedDoctors;
  }, []);

  const fetchSpecialties = useCallback(async () => {
    const { data, error } = await supabase
      .from('medicos')
      .select('specialty')
      .eq('is_active', true)
      .eq('is_public', true);

    if (!error && data) {
      const uniqueSpecialties = [...new Set(data.map(d => d.specialty).filter(Boolean))].sort();
      setSpecialties(uniqueSpecialties);
    }
  }, []);

  const { execute: loadData, status, value: doctors, error: loadError } = useAsync(fetchPublicDoctors, true);

  useEffect(() => {
    fetchSpecialties();
    const channel = supabase
      .channel('public:medicos-list-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medicos' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData, fetchSpecialties]);

  const handleScheduleSave = useCallback(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (doctors && doctors.length > 0 && searchParams.get('edit') === '1' && user) {
      const canEdit = doctors.some(d => d.user_id === user.id);
      setIsEditorOpen(canEdit);
    } else {
      setIsEditorOpen(false);
    }
  }, [searchParams, user, doctors]);

  const handleToggleEditor = () => {
    if (isEditorOpen) {
      navigate('/agendamentos');
    } else {
      navigate('/agendamentos?edit=1');
    }
  };

  const handleSearch = () => {
    setActiveFilters({
      specialty: selectedSpecialty,
      date: selectedDate,
      priceSort: priceSort
    });

    let description = "Resultados atualizados.";
    if (selectedDate) description = "Mostrando médicos que atendem nesta data.";
    if (selectedSpecialty) description = `Filtrando por ${selectedSpecialty}.`;

    toast({
      title: "Filtros aplicados",
      description: description,
      variant: "default"
    });
  };

  const handleClearFilters = () => {
    setSearchName('');
    setSelectedSpecialty('');
    setSelectedDate('');
    setPriceSort('');
    setActiveFilters({
      specialty: '',
      date: '',
      priceSort: ''
    });
    toast({ title: "Filtros limpos", description: "Mostrando todos os médicos.", variant: "outline" });
  };

  const filteredDoctors = useMemo(() => {
    if (!doctors) return [];

    let result = [...doctors];

    // Busca por nome/especialidade (texto livre) — casa com a busca da home (?q=)
    const term = searchName.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (term) {
      result = result.filter((d) => {
        const hay = `${d.public_name || d.name || ''} ${d.specialty || ''}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        return hay.includes(term);
      });
    }

    if (activeFilters.specialty && activeFilters.specialty !== 'all') {
      result = result.filter(doc => doc.specialty === activeFilters.specialty);
    }

    if (activeFilters.date) {
      const dateObj = parseISO(activeFilters.date);
      const dayOfWeek = getDay(dateObj);

      result = result.filter(doc => {
        return doc.agenda_medico?.some(
          rule => rule.dia_semana === dayOfWeek && rule.status === 'disponivel'
        );
      });
    }

    // Ranking para dar mais visualizações a quem tem agenda disponível:
    // 1) Quem tem próximo horário disponível vem sempre antes de quem não tem
    //    (sem horário não é agendável, então vai para o fim).
    // 2) Se um filtro de preço estiver ativo, ele manda dentro do grupo disponível
    //    (Menor preço = mais barato no topo, mais caro no fim).
    // 3) Sem filtro de preço: horário mais próximo primeiro (mais cedo = mais no topo).
    //    Desempate: melhor nota e mais avaliações.
    const nextSlot = (doc) => (doc.nextSlotMs != null ? doc.nextSlotMs : Infinity);

    result.sort((a, b) => {
      const aAvail = a.nextSlotMs != null;
      const bAvail = b.nextSlotMs != null;
      if (aAvail !== bAvail) return aAvail ? -1 : 1;

      if (activeFilters.priceSort) {
        const priceA = doctorPrices[a.id] || 0;
        const priceB = doctorPrices[b.id] || 0;
        if (priceA !== priceB) return activeFilters.priceSort === 'asc' ? priceA - priceB : priceB - priceA;
        return nextSlot(a) - nextSlot(b);
      }

      if (nextSlot(a) !== nextSlot(b)) return nextSlot(a) - nextSlot(b);
      if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
      return (b.reviewCount || 0) - (a.reviewCount || 0);
    });

    return result;
  }, [doctors, activeFilters, doctorPrices, searchName]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const renderContent = () => {
    if (status === 'pending' || status === 'idle') {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="text-center py-16 text-muted-foreground bg-white border border-destructive/20 rounded-2xl shadow-sm">
          <Frown className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">Erro ao Carregar Médicos</h3>
          <p className="mt-2 text-sm">{loadError.message}</p>
        </div>
      );
    }

    if (status === 'success') {
      if (filteredDoctors.length > 0) {
        const loggedInDoctor = user ? doctors.find(d => d.user_id === user.id) : null;
        const canEdit = !!loggedInDoctor;

        return (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4 relative">
            {canEdit && (
              <div className="flex justify-end mb-2">
                <Button onClick={handleToggleEditor} variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  {isEditorOpen ? 'Fechar Editor' : 'Editar Horários'}
                </Button>
              </div>
            )}
            {isEditorOpen && canEdit ? (
              <DoctorSchedule onScheduleSave={handleScheduleSave} />
            ) : (
              <>
                {filteredDoctors.slice(0, visibleCount).map(doctor => (
                  <DoctorScheduleCard
                    key={doctor.id}
                    initialDoctor={doctor}
                    onScheduleUpdate={handleScheduleSave}
                    isFallback={doctor.is_fallback}
                    patientPrice={doctorPrices[doctor.id]}
                    formattedPatientPrice={formatPrice(doctorPrices[doctor.id])}
                  />
                ))}
                {filteredDoctors.length > visibleCount && (
                  <div className="flex justify-center pt-3">
                    <Button
                      variant="outline"
                      onClick={() => setVisibleCount((c) => c + 5)}
                      className="rounded-full h-11 px-7 bg-white border-slate-200 text-slate-700 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-800 font-semibold shadow-sm"
                    >
                      Carregar mais médicos
                      <span className="ml-2 text-xs font-normal text-slate-400">+{Math.min(5, filteredDoctors.length - visibleCount)}</span>
                    </Button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        );
      } else {
        return (
          <div className="text-center py-16 text-muted-foreground bg-white border border-slate-200 rounded-2xl shadow-sm">
            <Filter className="mx-auto h-12 w-12 text-primary/50" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">Nenhum médico encontrado</h3>
            <p className="mt-2 text-sm">
              {doctors.length === 0
                ? "Não há médicos ativos no momento."
                : "Tente ajustar seus filtros de busca para ver mais resultados."}
            </p>
            {doctors.length > 0 && (
              <Button variant="link" onClick={handleClearFilters} className="mt-2 text-primary">
                Limpar Filtros
              </Button>
            )}
          </div>
        );
      }
    }
    return null;
  };

  return (
    <>
      <Helmet>
        <title>{`Agendar Consulta · ${BRAND.name}`}</title>
        <meta name="description" content="Encontre profissionais disponíveis, compare preços e horários e agende sua teleconsulta em minutos." />
        <link rel="canonical" href={`${BRAND.url}/agendamentos`} />
      </Helmet>

      {/* Fundo de página cinza full-bleed (ocupa a largura toda; barra de busca vai de ponta a ponta) */}
      <div className="mx-[calc(50%-50vw)] w-screen -my-8 bg-slate-100 min-h-[calc(100vh-4rem)]">
        {/* Título da página — sempre visível no topo (inclusive no mobile) */}
        <div className="container mx-auto px-4 pt-5 pb-2">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Agendar Consulta</h1>
          <p className="text-sm text-slate-500 mt-0.5">Escolha um médico e agende sua teleconsulta online.</p>
        </div>

        {/* Barra de busca / filtros — compacta no mobile (busca em cima, filtros em 3 colunas, botão embaixo) */}
        <div className={cn(
          "bg-white/90 backdrop-blur-md border-y border-slate-200 py-3 shadow-sm sticky top-16 z-20 transition-transform duration-300 ease-out",
          hideFilters ? "-translate-y-full shadow-none" : "translate-y-0"
        )}>
          <div className="container mx-auto px-4">
            {/* Mobile: grade 2×2 (Especialidade | Data / Preço | Buscar). Desktop: tudo numa linha. */}
            <div className="grid grid-cols-2 gap-2 md:flex md:items-center md:justify-center">
              {/* Especialidade */}
              <div className="md:w-52">
                <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                  <SelectTrigger className="h-10 px-2.5 md:px-3 w-full bg-white border border-slate-200 rounded-lg text-sm shadow-sm text-slate-700"><SelectValue placeholder="Especialidade" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">Todas Especialidades</SelectItem>
                    {specialties.length > 0 ? (
                      specialties.map((spec) => (
                        <SelectItem key={spec} value={spec} className="cursor-pointer text-sm">{spec}</SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-xs text-muted-foreground text-center">Carregando...</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Data */}
              <div className="md:w-40">
                <Input
                  type="date"
                  className="h-10 px-2 md:px-3 w-full bg-white border border-slate-200 rounded-lg text-sm shadow-sm text-slate-700 block"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Preço */}
              <div className="md:w-36">
                <Select value={priceSort} onValueChange={setPriceSort}>
                  <SelectTrigger className="h-10 px-2.5 md:px-3 w-full bg-white border border-slate-200 rounded-lg text-sm shadow-sm text-slate-700"><SelectValue placeholder="Preço" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Menor Preço</SelectItem>
                    <SelectItem value="desc">Maior Preço</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Ações: Buscar (+ limpar quando houver filtro) */}
              <div className="flex items-center gap-2 md:w-auto">
                <Button
                  className="h-10 px-4 md:px-6 flex-1 md:flex-grow-0 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-lg shadow-sm hover:shadow-md transition"
                  onClick={handleSearch}
                >
                  <Search className="mr-2 h-4 w-4" /> Buscar
                </Button>
                {(searchName || selectedSpecialty || selectedDate || priceSort) && (
                  <Button
                    variant="ghost"
                    className="h-10 w-10 p-0 shrink-0 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    onClick={handleClearFilters}
                    title="Limpar Filtros"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Lista */}
        <div className="container mx-auto px-4 py-8 pb-12">
          <div className="max-w-6xl mx-auto">
            {status === 'success' && filteredDoctors.length > 0 && (
              <p className="text-sm text-slate-500 mb-4">
                {filteredDoctors.length === 1
                  ? '1 médico disponível'
                  : `Mostrando ${Math.min(visibleCount, filteredDoctors.length)} de ${filteredDoctors.length} médicos`}
              </p>
            )}
            {renderContent()}
          </div>
        </div>
      </div>
    </>
  );
};

export default AppointmentsPage;
