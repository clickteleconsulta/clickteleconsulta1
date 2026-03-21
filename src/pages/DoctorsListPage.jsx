import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import {
  Search,
  SlidersHorizontal,
  Star,
  Clock,
  Zap,
  ChevronDown,
  X,
  Stethoscope,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ─── Skeleton Card ────────────────────────────────────────────────────────────
const DoctorCardSkeleton = () => (
  <div className="bg-white border border-gray-100 rounded-2xl p-5 flex gap-4">
    <Skeleton className="w-20 h-20 rounded-xl flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-8 w-32 mt-2" />
    </div>
  </div>
);

// ─── Doctor List Card ─────────────────────────────────────────────────────────
const DoctorListCard = ({ doctor, price }) => {
  const isAvailableNow = false; // TODO: real-time slot check when API supports it

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 hover:shadow-md hover:border-primary/20 transition-all duration-200">
      {/* Foto */}
      <Avatar className="w-20 h-20 rounded-xl flex-shrink-0 self-start">
        <AvatarImage
          src={doctor.image_url}
          alt={doctor.public_name || doctor.name}
          className="object-cover"
        />
        <AvatarFallback className="rounded-xl text-2xl bg-primary/10 text-primary">
          {(doctor.public_name || doctor.name || 'M')[0]}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-lg text-slate-900 leading-tight">
                {doctor.public_name || doctor.name}
              </h2>
              {isAvailableNow && (
                <Badge className="bg-green-500 text-white text-[10px] px-2 py-0.5 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Disponível Agora
                </Badge>
              )}
            </div>
            <p className="text-sm text-primary font-medium flex items-center gap-1 mt-0.5">
              <Stethoscope className="w-3.5 h-3.5" />
              {doctor.specialty}
            </p>
            {doctor.crm && (
              <p className="text-xs text-muted-foreground mt-0.5">
                CRM: {doctor.crm}/{doctor.uf || 'BR'}
              </p>
            )}
          </div>

          {/* Preço */}
          <div className="text-right flex-shrink-0">
            {price !== null && price !== undefined ? (
              <p className="text-2xl font-extrabold text-blue-600">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(price)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Consulte</p>
            )}
            <p className="text-xs text-muted-foreground">por consulta</p>
          </div>
        </div>

        {/* Bio */}
        {doctor.bio && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {doctor.bio}
          </p>
        )}

        {/* Rodapé */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-green-500" />
              Agendamento rápido
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              Médico verificado
            </span>
          </div>
          <Button asChild size="sm" className="rounded-full px-6">
            <Link to={`/medico/${doctor.id}`}>Ver Perfil e Agendar</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Filtros Sidebar ──────────────────────────────────────────────────────────
const SPECIALTIES = [
  'Clínico Geral',
  'Cardiologia',
  'Dermatologia',
  'Neurologia',
  'Ortopedia',
  'Pediatria',
  'Ginecologia',
  'Urologia',
  'Psiquiatria',
  'Endocrinologia',
];

const SORT_OPTIONS = [
  { value: 'relevancia', label: 'Relevância' },
  { value: 'preco_asc', label: 'Menor Preço' },
  { value: 'preco_desc', label: 'Maior Preço' },
];

// ─── Componente Principal ──────────────────────────────────────────────────────
const DoctorsListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialSpec = searchParams.get('especialidade') || '';

  const [doctors, setDoctors] = useState([]);
  const [prices, setPrices] = useState({}); // { doctorId: price }
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [selectedSpecialties, setSelectedSpecialties] = useState(
    initialSpec ? [initialSpec] : []
  );
  const [sortBy, setSortBy] = useState('relevancia');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Busca médicos
  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      let query = supabase
        .from('medicos')
        .select('*')
        .eq('is_active', true)
        .eq('is_public', true);

      if (selectedSpecialties.length > 0) {
        query = query.in('specialty', selectedSpecialties);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching doctors:', error);
        setDoctors([]);
      } else {
        setDoctors(data || []);
        // Busca preços em paralelo
        if (data && data.length > 0) {
          const ids = data.map((d) => d.id);
          const { data: procedData } = await supabase
            .from('procedimentos')
            .select('medico_id, preco')
            .in('medico_id', ids)
            .eq('principal', true);
          if (procedData) {
            const priceMap = {};
            procedData.forEach((p) => {
              priceMap[p.medico_id] = p.preco;
            });
            setPrices(priceMap);
          }
        }
      }
      setLoading(false);
    };
    fetchDoctors();
  }, [selectedSpecialties]);

  // Filtragem e ordenação client-side
  const filteredDoctors = useMemo(() => {
    let result = [...doctors];

    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter(
        (d) =>
          (d.public_name || d.name || '').toLowerCase().includes(q) ||
          (d.specialty || '').toLowerCase().includes(q)
      );
    }

    if (sortBy === 'preco_asc') {
      result.sort((a, b) => (prices[a.id] ?? Infinity) - (prices[b.id] ?? Infinity));
    } else if (sortBy === 'preco_desc') {
      result.sort((a, b) => (prices[b.id] ?? -Infinity) - (prices[a.id] ?? -Infinity));
    }

    return result;
  }, [doctors, debouncedQuery, sortBy, prices]);

  const toggleSpecialty = useCallback((spec) => {
    setSelectedSpecialties((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  }, []);

  const clearFilters = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setSelectedSpecialties([]);
    setSortBy('relevancia');
  };

  const hasActiveFilters = selectedSpecialties.length > 0 || debouncedQuery;

  const FiltersPanel = () => (
    <div className="space-y-6">
      {/* Especialidade */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
          Especialidade
        </h3>
        <div className="space-y-2">
          {SPECIALTIES.map((spec) => (
            <div key={spec} className="flex items-center gap-2">
              <Checkbox
                id={`spec-${spec}`}
                checked={selectedSpecialties.includes(spec)}
                onCheckedChange={() => toggleSpecialty(spec)}
              />
              <Label
                htmlFor={`spec-${spec}`}
                className="text-sm text-slate-700 cursor-pointer hover:text-primary transition-colors"
              >
                {spec}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
        >
          <X className="w-4 h-4" /> Limpar Filtros
        </Button>
      )}
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Encontre seu Médico — Click Teleconsulta</title>
        <meta
          name="description"
          content="Encontre especialistas disponíveis e agende sua teleconsulta agora."
        />
      </Helmet>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
          Nossos Especialistas
        </h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Escolha o profissional ideal e agende sua consulta online com facilidade.
        </p>
      </div>

      {/* Barra de busca + ordenação */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome ou especialidade..."
            className="pl-9 rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-900"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-48 rounded-xl">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          className="sm:hidden rounded-xl gap-2"
          onClick={() => setMobileFiltersOpen((v) => !v)}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
          {selectedSpecialties.length > 0 && (
            <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
              {selectedSpecialties.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Filtros mobile */}
      {mobileFiltersOpen && (
        <div className="sm:hidden bg-white border border-gray-100 rounded-2xl p-5 mb-6 shadow-sm">
          <FiltersPanel />
        </div>
      )}

      <div className="grid md:grid-cols-[240px_1fr] gap-8 items-start">
        {/* Filtros desktop */}
        <aside className="hidden md:block sticky top-24 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" /> Filtros
            </h2>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-destructive hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Limpar
              </button>
            )}
          </div>
          <FiltersPanel />
        </aside>

        {/* Lista */}
        <div>
          {/* Tags de filtros ativos */}
          {selectedSpecialties.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedSpecialties.map((spec) => (
                <Badge
                  key={spec}
                  variant="secondary"
                  className="gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => toggleSpecialty(spec)}
                >
                  {spec} <X className="w-3 h-3" />
                </Badge>
              ))}
            </div>
          )}

          {/* Contagem */}
          {!loading && (
            <p className="text-sm text-muted-foreground mb-4">
              {filteredDoctors.length}{' '}
              {filteredDoctors.length === 1 ? 'especialista encontrado' : 'especialistas encontrados'}
            </p>
          )}

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <DoctorCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <Stethoscope className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-slate-500 text-lg font-medium">
                Nenhum especialista encontrado
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Tente ajustar os filtros ou limpar a busca.
              </p>
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                Limpar Filtros
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDoctors.map((doctor) => (
                <DoctorListCard
                  key={doctor.id}
                  doctor={doctor}
                  price={prices[doctor.id]}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DoctorsListPage;
