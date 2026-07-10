
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { DoctorScheduleCard } from '@/components/DoctorScheduleCard';
import { Loader2, Frown, Edit, Search, Filter, X } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DoctorSchedule from '@/components/doctor/DoctorSchedule';
import { Button } from '@/components/ui/button';
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
  const [doctorPrices, setDoctorPrices] = useState({});

  const [activeFilters, setActiveFilters] = useState({
    specialty: '',
    date: '',
    priceSort: ''
  });

  const formatPrice = (value) => {
    if (value === undefined || value === null) return null;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const fetchPublicDoctors = useCallback(async () => {
    const { data: publicDoctors, error: fetchError } = await supabase
      .from('medicos')
      .select('*, agenda_medico(*), procedimentos(*)')
      .eq('is_public', true)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching doctors:', fetchError);
      throw new Error("Não foi possível buscar os dados dos médicos. Tente novamente.");
    }

    const newDoctorPrices = {};

    const processedDoctors = (publicDoctors || []).map(doc => {
      const taxaPercentual = doc.payment_settings?.platform_fee_percent || 0;
      const mainProc = doc.procedimentos?.find(p => p.principal);
      const precoRepasse = mainProc ? Number(mainProc.preco) : (Number(doc.price_in_cents) / 100 || 0);
      const precoFinal = taxaPercentual === 0 ? precoRepasse : precoRepasse / (1 - (taxaPercentual / 100));
      newDoctorPrices[doc.id] = precoFinal;
      return {
        ...doc,
        price_in_cents: Math.round(precoFinal * 100),
      };
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

    if (activeFilters.priceSort) {
      result.sort((a, b) => {
        const priceA = doctorPrices[a.id] || 0;
        const priceB = doctorPrices[b.id] || 0;
        return activeFilters.priceSort === 'asc' ? priceA - priceB : priceB - priceA;
      });
    }

    return result;
  }, [doctors, activeFilters, doctorPrices]);

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
              filteredDoctors.map(doctor => (
                <DoctorScheduleCard
                  key={doctor.id}
                  initialDoctor={doctor}
                  onScheduleUpdate={handleScheduleSave}
                  isFallback={doctor.is_fallback}
                  patientPrice={doctorPrices[doctor.id]}
                  formattedPatientPrice={formatPrice(doctorPrices[doctor.id])}
                />
              ))
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
        <title>Agendar Consulta - Click Teleconsulta</title>
        <meta name="description" content="Agende sua teleconsulta com um de nossos especialistas de forma rápida e segura." />
      </Helmet>

      {/* Fundo de página cinza (full-bleed dentro do container) */}
      <div className="-mx-4 -my-8 bg-slate-100 min-h-[calc(100vh-4rem)]">
        {/* Barra de busca — branca, centralizada, só os filtros */}
        <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 py-4 shadow-sm sticky top-16 z-20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-center gap-2">
              <div className="w-full md:w-52">
                <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                  <SelectTrigger className="h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 text-slate-700">
                    <SelectValue placeholder="Especialidade" />
                  </SelectTrigger>
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

              <div className="w-full md:w-40 relative">
                <Input
                  type="date"
                  className="h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 text-slate-700 block w-full"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="w-full md:w-36">
                <Select value={priceSort} onValueChange={setPriceSort}>
                  <SelectTrigger className="h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 text-slate-700">
                    <SelectValue placeholder="Preço" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Menor Preço</SelectItem>
                    <SelectItem value="desc">Maior Preço</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <Button
                  className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm hover:shadow-md transition flex-grow md:flex-grow-0"
                  onClick={handleSearch}
                >
                  <Search className="md:mr-2 h-4 w-4" />
                  <span className="md:inline">Buscar</span>
                </Button>

                {(selectedSpecialty || selectedDate || priceSort) && (
                  <Button
                    variant="ghost"
                    className="h-10 w-10 p-0 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
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
            {renderContent()}
          </div>
        </div>
      </div>
    </>
  );
};

export default AppointmentsPage;
