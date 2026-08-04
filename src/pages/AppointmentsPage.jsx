
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { BRAND } from '@/config/brand';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { patientPriceFromRepasse } from '@/lib/price';
import { PUBLIC_DOCTOR_COLUMNS } from '@/lib/publicDoctorColumns';
import { nextAvailableSlotMs, temHorarioLivreNoDia } from '@/lib/doctorAvailability';
import { doctorPath } from '@/lib/doctorSlug';
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
import { parseISO, format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

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
// Escolhidas para cair METADE em estrela cheia e metade em meia: com 4,8 e 4,2
// a quantização levava quase tudo para cheia e a meia estrela mal aparecia na
// pré-visualização, que é justamente o que se quer conferir.
//   5,0 → 5    4,7 → 4½    4,0 → 4    3,4 → 3½    2,8 → 3
const AMOSTRAS = [
  { rating: 5.0, reviewCount: 3 },
  { rating: 4.7, reviewCount: 47 },
  { rating: 4.0, reviewCount: 128 },
  { rating: 3.4, reviewCount: 9 },
  { rating: 2.8, reviewCount: 214 },
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

  useEffect(() => { setVisibleCount(5); }, [activeFilters, searchName]);

  // A busca da home manda ?q=. Sem isto, o valor só era lido na montagem: quem
  // já estava nesta página e buscava de novo pela home via a URL mudar e a lista
  // continuar igual.
  const qDaUrl = searchParams.get('q') || '';
  useEffect(() => { setSearchName(qDaUrl); }, [qDaUrl]);

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
      // Colunas nomeadas em vez de `(*)`: a agenda e os procedimentos carregam
      // campos que esta tela não usa, e vinham em toda listagem.
      .select(
        `${PUBLIC_DOCTOR_COLUMNS},`
        + ' agenda_medico(dia_semana, status, hora_inicio, hora_fim, intervalo_em_minutos),'
        + ' procedimentos(principal, preco)'
      )
      .eq('is_public', true)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching doctors:', fetchError);
      throw new Error("Não foi possível buscar os dados dos médicos. Tente novamente.");
    }

    // As três consultas seguintes dependem só dos ids que já temos, então correm
    // JUNTAS. Em série elas somavam ~1,2 s de espera encadeada antes do primeiro
    // card aparecer: avaliações esperavam médicos, agendamentos esperavam
    // avaliações, bloqueios esperavam agendamentos — sem nenhuma precisar da
    // anterior.
    const userIds = (publicDoctors || []).map(d => d.user_id).filter(Boolean);
    const doctorIds = (publicDoctors || []).map(d => d.id).filter(Boolean);
    const agora = new Date().toISOString();

    const [revsRes, bookedRes, blocksRes] = await Promise.all([
      userIds.length
        ? supabase.from('avaliacoes').select('medico_id, rating').eq('status', 'publicada').in('medico_id', userIds)
        : Promise.resolve({ data: [] }),
      doctorIds.length
        ? supabase.from('agendamentos').select('medico_id, horario_inicio')
            .in('medico_id', doctorIds)
            .eq('pagamento_status', 'pago')
            .not('status', 'in', '(cancelado,expirado,expirado_pagamento)')
            .gte('horario_inicio', agora)
        : Promise.resolve({ data: [] }),
      doctorIds.length
        ? supabase.from('bloqueios_agenda').select('medico_id, inicio, fim').in('medico_id', doctorIds).gte('fim', agora)
        : Promise.resolve({ data: [] }),
    ]);

    // Notas reais: média + contagem de avaliações publicadas por médico (medico_id = user_id).
    const ratingsByUser = {};
    {
      const agg = {};
      (revsRes.data || []).forEach(r => {
        if (r.rating == null) return;
        (agg[r.medico_id] = agg[r.medico_id] || { sum: 0, n: 0 });
        agg[r.medico_id].sum += Number(r.rating);
        agg[r.medico_id].n += 1;
      });
      Object.keys(agg).forEach(uid => {
        ratingsByUser[uid] = { rating: agg[uid].sum / agg[uid].n, reviewCount: agg[uid].n };
      });
    }

    // Um índice por médico, servindo aos dois consumidores: o ranking desta
    // página (que quer instantes em ms) e o card (que procura por chave
    // "aaaa-mm-ddThh:mm:ss" no fuso de Brasília).
    const bookedByDoctor = {};   // id -> Set de instantes (ms)
    const bookedMapByDoctor = {}; // id -> Map chave -> true
    (bookedRes.data || []).forEach((b) => {
      if (!b.horario_inicio) return;
      const d = new Date(b.horario_inicio);
      (bookedByDoctor[b.medico_id] ||= new Set()).add(d.getTime());
      // No fuso de Brasília, e não no do visitante: a grade de horários do card
      // é montada em Brasília, então a chave precisa nascer no mesmo fuso. Antes
      // isto usava a hora local de quem acessa — quem abrisse o site fora do
      // horário de Brasília via como livre um horário já vendido.
      const emBrasilia = utcToZonedTime(d, 'America/Sao_Paulo');
      const chave = `${format(emBrasilia, 'yyyy-MM-dd')}T${format(emBrasilia, 'HH:mm:ss')}`;
      (bookedMapByDoctor[b.medico_id] ||= new Map()).set(chave, true);
    });

    const blocksByDoctor = {};
    (blocksRes.data || []).forEach((b) => {
      (blocksByDoctor[b.medico_id] ||= []).push({ inicio: new Date(b.inicio).getTime(), fim: new Date(b.fim).getTime() });
    });

    const newDoctorPrices = {};

    const processedDoctors = (publicDoctors || []).map((doc, indice) => {
      const taxaPercentual = doc.payment_settings?.platform_fee_percent || 0;
      const mainProc = doc.procedimentos?.find(p => p.principal);
      // Sem cair em medicos.price_in_cents. Essa coluna é legado: ninguém no
      // código escreve nela, hoje está NULA em quatro dos cinco médicos e
      // desatualizada no quinto. Como fallback ela era uma armadilha — um médico
      // que perdesse o procedimento principal passaria a ser exibido por
      // R$ 129,00 (valor velho) ou por R$ 0,00 (nulo), e no segundo caso daria
      // para agendar de graça. Sem preço, o médico não é vendável: ver o filtro
      // logo abaixo.
      const precoRepasse = mainProc ? Number(mainProc.preco) : 0;
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
        // Entregues prontos ao card. O `agenda_medico` já vem no join da consulta
        // de médicos, então nem ele precisa de ida ao banco.
        agendaPronta: doc.agenda_medico || [],
        bookedSlotsProntos: bookedMapByDoctor[doc.id] || new Map(),
        blocksProntos: blocksByDoctor[doc.id] || [],
        // Mesma informação em instantes (ms), que é o formato do ranking e do
        // filtro por data.
        bookedSetMs: bookedByDoctor[doc.id] || new Set(),
      };
    });

    // Próximo horário livre de cada médico, para o ranking por proximidade.
    processedDoctors.forEach((d) => {
      d.nextSlotMs = nextAvailableSlotMs(d.agenda_medico, bookedByDoctor[d.id], blocksByDoctor[d.id]);
    });

    // Médico sem preço não entra na vitrine. Não é filtro estético: sem preço o
    // card mostraria R$ 0,00 e o checkout abriria uma cobrança de zero. Fica no
    // console para quem for investigar, porque é falha de cadastro e não do
    // paciente.
    const semPreco = processedDoctors.filter((d) => !(d.price_in_cents > 0));
    if (semPreco.length) {
      console.warn(
        '[agendamentos] Médicos ocultos por não terem procedimento principal com preço:',
        semPreco.map((d) => d.public_name || d.name || d.id),
      );
    }

    setDoctorPrices(newDoctorPrices);
    return processedDoctors.filter((d) => d.price_in_cents > 0);
  }, []);

  const { execute: loadData, status, value: doctors, error: loadError } = useAsync(fetchPublicDoctors, true);

  // As especialidades saem da lista já carregada. Antes eram uma segunda
  // varredura na mesma tabela `medicos`, com os mesmos filtros, só para ler uma
  // coluna — e podia divergir da lista se as duas consultas caíssem em momentos
  // diferentes.
  const specialties = useMemo(
    () => [...new Set((doctors || []).map(d => d.specialty).filter(Boolean))].sort(),
    [doctors],
  );

  useEffect(() => {
    // Recarrega com atraso e agrupado. Qualquer médico salvando o perfil
    // dispara este evento em TODOS os visitantes com a página aberta, e a
    // recarga são quatro consultas; um médico mexendo em vários campos gerava
    // uma rajada de recargas. Meio segundo junta a rajada numa só.
    let timer = null;
    const recarregarEmBreve = () => {
      clearTimeout(timer);
      timer = setTimeout(() => loadData(), 500);
    };
    const channel = supabase
      .channel('public:medicos-list-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medicos' }, recarregarEmBreve)
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [loadData]);

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

  // Sem toast: a lista muda à vista e a contagem logo acima dela já diz quantos
  // sobraram — e agora é anunciada por aria-live a quem usa leitor de tela. Um
  // aviso flutuante por cima disso era ruído, e ainda tapava o primeiro card no
  // celular.
  const handleSearch = () => {
    setActiveFilters({
      specialty: selectedSpecialty,
      date: selectedDate,
      priceSort: priceSort
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
      // Vaga de verdade, não "tem regra nesse dia da semana". Antes o filtro
      // olhava só a agenda: um médico com o dia inteiro vendido ou bloqueado
      // aparecia na lista, e o paciente descobria a ausência de vaga só ao
      // abrir o card. Os dados para checar já estão carregados.
      const dia = parseISO(activeFilters.date);
      result = result.filter(doc =>
        temHorarioLivreNoDia(doc.agenda_medico, dia, doc.bookedSetMs, doc.blocksProntos));
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

  /**
   * A listagem descrita para o buscador: quem está na lista, em que ordem e
   * apontando para o perfil de cada um. Sem isto o Google via só um bloco de
   * texto e precisava adivinhar que ali há médicos agendáveis.
   *
   * Usa a lista JÁ FILTRADA e na ordem exibida — declarar algo diferente do que
   * a página mostra é justamente o que as diretrizes de dados estruturados
   * proíbem. O preço fica no `offers` porque é o que o paciente paga, o mesmo
   * valor impresso no card.
   */
  const itemList = useMemo(() => {
    if (status !== 'success' || filteredDoctors.length === 0) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Médicos disponíveis na ${BRAND.name}`,
      numberOfItems: filteredDoctors.length,
      itemListElement: filteredDoctors.slice(0, visibleCount).map((d, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Physician',
          name: d.public_name || d.name,
          medicalSpecialty: d.specialty || undefined,
          url: `${BRAND.url}${doctorPath(d)}`,
          ...(doctorPrices[d.id] > 0 && {
            offers: {
              '@type': 'Offer',
              price: doctorPrices[d.id].toFixed(2),
              priceCurrency: 'BRL',
              availability: d.nextSlotMs != null
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            },
          }),
        },
      })),
    };
  }, [status, filteredDoctors, visibleCount, doctorPrices]);

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
                    agendaPronta={doctor.agendaPronta}
                    bookedSlotsProntos={doctor.bookedSlotsProntos}
                    blocksProntos={doctor.blocksProntos}
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

      {/* Helmet à parte, e não um `{cond && <script/>}` dentro do de cima: o
          react-helmet descarta a lista de filhos inteira quando um deles é
          `false`. Com a condição aqui fora, ou o bloco existe com o script
          dentro, ou não existe. */}
      {itemList && (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify(itemList)}</script>
        </Helmet>
      )}

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
                  // Campo de data não tem texto visível para servir de rótulo:
                  // sem isto o leitor de tela anunciava apenas "editar".
                  aria-label="Filtrar por data de atendimento"
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
            {/* Título de seção entre o h1 e os nomes dos médicos (que são h3).
                Sem ele a hierarquia pulava de h1 para h3, e quem navega por
                títulos no leitor de tela não tinha como saber onde a lista
                começa. Invisível na tela, onde o contexto já é óbvio. */}
            <h2 className="sr-only">Médicos disponíveis</h2>

            {/* `aria-live`: filtrar trocava a lista em silêncio para quem usa
                leitor de tela. Agora a contagem — e o "carregando" — são
                anunciados sozinhos, sem roubar o foco de onde a pessoa está. */}
            <p className="text-sm text-slate-500 mb-4" role="status" aria-live="polite">
              {status === 'pending' || status === 'idle'
                ? 'Carregando médicos…'
                : status === 'success' && filteredDoctors.length > 0
                  ? (filteredDoctors.length === 1
                      ? '1 médico disponível'
                      : `Mostrando ${Math.min(visibleCount, filteredDoctors.length)} de ${filteredDoctors.length} médicos`)
                  : ''}
            </p>
            {renderContent()}
          </div>
        </div>
      </div>
    </>
  );
};

export default AppointmentsPage;
