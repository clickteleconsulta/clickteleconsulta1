import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import {
  Search,
  SlidersHorizontal,
  Clock,
  ShieldCheck,
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

// ─── Skeleton Card ────────────────────────────────────────────────────────────
const DoctorCardSkeleton = () => (
  <div className="bg-white border border-slate-200/70 rounded-xl p-4 flex gap-4 shadow-sm">
    <Skeleton className="w-16 h-16 rounded-xl flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-8 w-28 mt-2 rounded-lg" />
    </div>
  </div>
);

// ─── Doctor List Card (compacto, branco sobre cinza) ────────────────────────────
const DoctorListCard = ({ doctor, price }) => (
  <div className="group bg-white border border-slate-200/70 rounded-xl p-4 flex gap-4 shadow-sm hover:shadow-md hover:border-sky-200 transition-all duration-200">
    {/* Foto */}
    <Avatar className="w-16 h-16 rounded-xl flex-shrink-0 self-start">
      <AvatarImage
        src={doctor.image_url}
        alt={doctor.public_name || doctor.name}
        className="object-cover"
      />
      <AvatarFallback className="rounded-xl text-xl font-bold bg-sky-50 text-sky-600">
        {(doctor.public_name || doctor.name || 'M')[0]}
      </AvatarFallback>
    </Avatar>

    {/* Info */}
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-semibold text-base text-slate-900 leading-tight truncate">
            {doctor.public_name || doctor.name}
          </h2>
          <p className="text-xs text-sky-600 font-medium flex items-center gap-1 mt-0.5">
            <Stethoscope className="w-3 h-3" />
            {doctor.specialty}
          </p>
          {doctor.crm && (
            <p className="text-[11px] text-slate-400 mt-0.5">
              CRM {doctor.crm}/{doctor.uf || 'BR'}
            </p>
          )}
        </div>

        {/* Preço */}
        <div className="text-right flex-shrink-0">
          {price !== null && price !== undefined ? (
            <p className="text-lg font-bold text-slate-900">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
            </p>
          ) : (
            <p className="text-xs text-slate-400">Consulte</p>
          )}
          <p className="text-[11px] text-slate-400">por consulta</p>
        </div>
      </div>

      {doctor.bio && (
        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
          {doctor.bio}
        </p>
      )}

      {/* Rodapé refinado */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Verificado
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-sky-500" /> Agendamento rápido
          </span>
        </div>
        <Button asChild size="sm" className="rounded-lg h-8 px-4 text-xs bg-[#0a2540] hover:bg-[#0a2540]/90 text-white font-semibold shadow-sm">
          <Link to={`/medico/${doctor.id}`}>Ver Perfil e Agendar</Link>
        </Button>
      </div>
    </div>
  </div>
);

// ─── Filtros ──────────────────────────────────────────────────────────────────
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
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialSpec = searchParams.get('especialidade') || '';

  const [doctors, setDoctors] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [selectedSpecialties, setSelectedSpecialties] = useState(
    initialSpec ? [initialSpec] : []
  );
  const [sortBy, setSortBy] = useState('relevancia');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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
        if (data && data.length > 0) {
          const ids = data.map((d) => d.id);
          const { data: procedData } = await supabase
            .from('procedimentos')
            .select('medico_id, preco')
            .in('medico_id', ids)
            .eq('principal', true);
          if (procedData) {
            const priceMap = {};
            procedData.forEach((p) => { priceMap[p.medico_id] = p.preco; });
            setPrices(priceMap);
          }
        }
      }
      setLoading(false);
    };
    fetchDoctors();
  }, [selectedSpecialties]);

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
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">
          Especialidade
        </h3>
        <div className="space-y-2">
          {SPECIALTIES.map((spec) => (
            <div key={spec} className="flex items-center gap-2">
              <Checkbox
                id={`spec-${spec}`}
                checked={selectedSpecialties.includes(spec)}
                onCheckedChange={() => toggleSpecialty(spec)}
                className="border-slate-300 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
              />
              <Label
                htmlFor={`spec-${spec}`}
                className="text-sm text-slate-600 cursor-pointer hover:text-sky-600 transition-colors"
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
          className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 gap-2"
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
        <meta name="description" content="Encontre especialistas disponíveis e agende sua teleconsulta agora." />
      </Helmet>

      {/* Fundo de página cinza (full-bleed dentro do container) */}
      <div className="-mx-4 -my-8 px-4 py-8 bg-slate-50 min-h-[calc(100vh-4rem)]">
        {/* Cabeçalho enxuto */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Nossos Especialistas</h1>
          <p className="text-sm text-slate-500 mt-1">Escolha o profissional ideal e agende online.</p>
        </div>

        {/* Busca + ordenação */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou especialidade..."
              className="pl-9 h-11 rounded-xl bg-white border-slate-200 shadow-sm text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-44 h-11 rounded-xl bg-white border-slate-200 shadow-sm">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="sm:hidden h-11 rounded-xl gap-2 border-slate-200 bg-white shadow-sm"
              onClick={() => setMobileFiltersOpen((v) => !v)}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {selectedSpecialties.length > 0 && (
                <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-sky-500">
                  {selectedSpecialties.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {mobileFiltersOpen && (
          <div className="sm:hidden bg-white border border-slate-200/70 rounded-xl p-4 mb-5 shadow-sm">
            <FiltersPanel />
          </div>
        )}

        <div className="grid md:grid-cols-[220px_1fr] gap-6 items-start">
          {/* Filtros desktop */}
          <aside className="hidden md:block sticky top-24 bg-white border border-slate-200/70 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <SlidersHorizontal className="w-4 h-4" /> Filtros
              </h2>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-red-500 hover:underline">
                  Limpar
                </button>
              )}
            </div>
            <FiltersPanel />
          </aside>

          {/* Lista */}
          <div>
            {selectedSpecialties.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedSpecialties.map((spec) => (
                  <Badge
                    key={spec}
                    variant="secondary"
                    className="gap-1 cursor-pointer bg-sky-50 text-sky-700 border-sky-200 hover:bg-red-50 hover:text-red-600 rounded-full px-3 py-1 text-xs"
                    onClick={() => toggleSpecialty(spec)}
                  >
                    {spec} <X className="w-3 h-3" />
                  </Badge>
                ))}
              </div>
            )}

            {!loading && (
              <p className="text-sm text-slate-400 mb-3">
                {filteredDoctors.length}{' '}
                {filteredDoctors.length === 1 ? 'especialista encontrado' : 'especialistas encontrados'}
              </p>
            )}

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <DoctorCardSkeleton key={i} />)}
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200 shadow-sm">
                <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-base font-medium">Nenhum especialista encontrado</p>
                <p className="text-sm text-slate-400 mt-1">Tente ajustar os filtros ou limpar a busca.</p>
                <Button variant="outline" onClick={clearFilters} className="mt-4 rounded-lg">Limpar Filtros</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDoctors.map((doctor) => (
                  <DoctorListCard key={doctor.id} doctor={doctor} price={prices[doctor.id]} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DoctorsListPage;
