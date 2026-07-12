import React, { useCallback, useEffect, useState } from 'react';
import { formatDoctorDisplayName } from '@/lib/doctorName';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { toSiteUrl } from '@/lib/storageUrl';
import { Loader2, Frown, Star, MapPin, Shield, Edit, Save, Info, MessageCircle, CheckCircle, Phone, Calendar } from 'lucide-react';
import useAsync from '@/hooks/useAsync';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── SEO slug helpers ──────────────────────────────────────────────────────────
const slugify = (str = '') =>
  str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// ─── JSON-LD Schema.org Physician ─────────────────────────────────────────────
const PhysicianSchema = ({ doctor }) => {
  if (!doctor) return null;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Physician",
    "name": doctor.public_name || doctor.name,
    "medicalSpecialty": doctor.specialty,
    "identifier": doctor.crm ? `CRM/${doctor.uf || 'BR'} ${doctor.crm}` : undefined,
    "image": doctor.image_url || undefined,
    "description": doctor.bio || undefined,
    "availableService": {
      "@type": "MedicalTherapy",
      "name": "Teleconsulta"
    },
    "url": typeof window !== 'undefined' ? window.location.href : undefined,
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  );
};

// ─── Star Distribution ─────────────────────────────────────────────────────────
const StarDistribution = ({ reviews }) => {
  if (!reviews?.length) return null;
  const counts = [5, 4, 3, 2, 1].map(n => ({
    star: n,
    count: reviews.filter(r => r.rating === n).length,
    pct: Math.round(reviews.filter(r => r.rating === n).length / reviews.length * 100),
  }));

  return (
    <div className="space-y-1.5 mt-3">
      {counts.map(({ star, count, pct }) => (
        <div key={star} className="flex items-center gap-2 text-xs">
          <span className="w-6 text-right text-gray-500">{star}★</span>
          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
            <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <span className="w-5 text-gray-400">{count}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Reviews Section ───────────────────────────────────────────────────────────
const ReviewsSection = ({ reviews }) => {
  const averageRating = reviews?.length
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div id="avaliacoes" className="mt-6 space-y-4 scroll-mt-24">
      <div className="flex items-start justify-between">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          Avaliações
        </h3>
        {averageRating && (
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{averageRating}</div>
            <div className="flex justify-end mt-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn("w-3 h-3", i < Math.round(Number(averageRating)) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">{reviews.length} avaliações</p>
          </div>
        )}
      </div>

      {reviews?.length > 0 && <StarDistribution reviews={reviews} />}

      {reviews && reviews.length > 0 ? (
        <div className="grid gap-3">
          {reviews.map(review => (
            <div key={review.id} className="bg-muted/30 p-3 rounded-md border border-border/50">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="font-medium text-xs">Paciente Verificado</div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn("w-3 h-3", i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                  ))}
                </div>
              </div>
              {review.comentario && <p className="text-xs text-foreground/80 mt-1 italic">"{review.comentario}"</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-muted/20 rounded-md border border-dashed">
          <p className="text-muted-foreground text-sm">Este especialista ainda não possui avaliações visíveis.</p>
        </div>
      )}
    </div>
  );
};

// ─── Embedded Appointment Form ─────────────────────────────────────────────────
const EmbeddedAppointmentForm = ({ doctor }) => (
  <div className="bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col gap-4">
    <h3 className="font-bold text-lg text-foreground">Agendar Consulta</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      Clique no botão abaixo para ver os horários disponíveis e realizar seu agendamento online de forma rápida e segura.
    </p>
    <Button asChild className="w-full bg-primary hover:bg-primary/90 font-bold py-6">
      <Link to="/agendamentos">
        <Calendar className="w-4 h-4 mr-2" /> Ver Horários Disponíveis
      </Link>
    </Button>
    {doctor?.whatsapp_enabled && doctor?.whatsapp && (
      <a
        href={`https://wa.me/55${doctor.whatsapp.replace(/\D/g, '')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 rounded-lg py-2.5 text-sm font-semibold transition-colors"
      >
        <MessageCircle className="w-4 h-4" /> Falar pelo WhatsApp
      </a>
    )}
    <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground bg-muted/30 p-2.5 rounded-lg mt-2">
      <Shield className="w-3 h-3" />
      <span>Pagamento seguro e dados protegidos</span>
    </div>
  </div>
);

// ─── Doctor Editor Dialog ──────────────────────────────────────────────────────
const DoctorEditorDialog = ({ doctor, isOpen, onOpenChange, onSave }) => {
  const [formData, setFormData] = useState({
    bio: doctor.bio || '',
    instructions: doctor.instructions || '',
    specialty: doctor.specialty || '',
    whatsapp_enabled: doctor.whatsapp_enabled || false,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch {}
    finally { setIsSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar Perfil Público</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Especialidade</Label>
            <Input value={formData.specialty} onChange={e => setFormData(p => ({ ...p, specialty: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Descrição Profissional (Bio)</Label>
            <Textarea className="min-h-[100px]" value={formData.bio} onChange={e => setFormData(p => ({ ...p, bio: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Instruções de Atendimento</Label>
            <Textarea className="min-h-[100px]" value={formData.instructions} onChange={e => setFormData(p => ({ ...p, instructions: e.target.value }))} placeholder="Ex: Chegar 5 min antes, ter exames em mãos..." />
          </div>
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border">
            <div>
              <p className="text-sm font-medium">Habilitar botão WhatsApp</p>
              <p className="text-xs text-gray-400">Exibe botão de contato direto no perfil público</p>
            </div>
            <input type="checkbox" checked={formData.whatsapp_enabled} onChange={e => setFormData(p => ({ ...p, whatsapp_enabled: e.target.checked }))} className="w-4 h-4" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
const DoctorPublicProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const fetchDoctorProfile = useCallback(async () => {
    if (!id) throw new Error("ID do médico não fornecido.");

    // Try UUID lookup first, then slug lookup
    let doctorData;
    const isUUID = /^[0-9a-f-]{36}$/.test(id);

    if (isUUID) {
      const { data, error } = await supabase.from('medicos').select('*').eq('id', id).eq('is_active', true).single();
      if (error || !data) throw new Error("Médico não encontrado.");
      doctorData = data;
    } else {
      // Slug lookup: try to match public_name + specialty
      const { data, error } = await supabase.from('medicos').select('*').eq('is_active', true);
      if (error) throw error;
      doctorData = data?.find(d => {
        const name = slugify(d.public_name || d.name);
        const spec = slugify(d.specialty || '');
        const combined = `${name}-${spec}`;
        return combined === id || name === id;
      });
      if (!doctorData) throw new Error("Médico não encontrado.");
    }

    return { doctor: doctorData };
  }, [id]);

  const fetchReviews = useCallback(async () => {
    const { data: doc } = await supabase.from('medicos').select('user_id').eq('id', id).single();
    if (doc?.user_id) {
      const { data } = await supabase.from('avaliacoes').select('*').eq('medico_id', doc.user_id).eq('status', 'publicada').order('created_at', { ascending: false });
      setReviews(data || []);
    }
  }, [id]);

  const { status, value: profileData, error: loadError, setValue: setProfileData } = useAsync(fetchDoctorProfile, true);

  useEffect(() => {
    if (status === 'success') fetchReviews();
  }, [status, fetchReviews]);

  // Rola até a seção de Avaliações quando acessado via #avaliacoes (ex.: estrelas do card)
  useEffect(() => {
    if (status === 'success' && window.location.hash === '#avaliacoes') {
      const el = document.getElementById('avaliacoes');
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }
  }, [status, reviews]);

  const handleUpdateProfile = async (updatedData) => {
    if (!profileData?.doctor) return;
    const { error } = await supabase.from('medicos').update(updatedData).eq('id', profileData.doctor.id).eq('user_id', user.id);
    if (error) { toast({ variant: "destructive", title: "Erro ao atualizar", description: error.message }); throw error; }
    toast({ title: "Perfil atualizado com sucesso!" });
    setProfileData(prev => ({ ...prev, doctor: { ...prev.doctor, ...updatedData } }));
  };

  const isOwner = user && profileData?.doctor && user.id === profileData.doctor.user_id;
  const doctor = profileData?.doctor;

  // Build SEO-friendly URL slug
  const seoSlug = doctor ? `${slugify(doctor.public_name || doctor.name)}-${slugify(doctor.specialty || '')}` : '';
  const canonicalUrl = doctor ? `${typeof window !== 'undefined' ? window.location.origin : ''}/medico/${seoSlug || doctor.id}` : '';
  const ogImage = doctor?.image_url || `${typeof window !== 'undefined' ? window.location.origin : ''}/og-default.jpg`;
  const averageRating = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : null;

  const renderContent = () => {
    if (status === 'pending' || status === 'idle') {
      return <div className="flex justify-center items-center h-96"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
    }
    if (status === 'error') {
      return (
        <div className="text-center py-12 text-muted-foreground bg-card border border-destructive/20 rounded-lg">
          <Frown className="mx-auto h-10 w-10 text-destructive" />
          <h3 className="mt-3 text-lg font-semibold text-foreground">Erro ao Carregar Perfil</h3>
          <p className="mt-1 text-sm">{loadError?.message || "Médico não encontrado."}</p>
        </div>
      );
    }
    if (status === 'success' && doctor) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* Profile card */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="h-24 bg-gradient-to-r from-primary/10 to-primary/5 w-full" />
              <div className="px-5 pb-5 relative">
                <div className="flex justify-between items-end -mt-12 mb-3">
                  <Avatar className="w-24 h-24 border-4 border-background shadow-md bg-white">
                    <AvatarImage src={toSiteUrl(doctor.image_url)} alt={doctor.public_name} className="object-cover" />
                    <AvatarFallback className="text-2xl">{doctor.public_name?.[0] || 'M'}</AvatarFallback>
                  </Avatar>
                  {isOwner && (
                    <Button onClick={() => setIsEditorOpen(true)} variant="outline" size="sm" className="gap-2 h-8 text-xs">
                      <Edit className="w-3 h-3" /> Editar Perfil
                    </Button>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl md:text-2xl font-bold text-foreground">{formatDoctorDisplayName(doctor.sexo, doctor.public_name || doctor.name)}</h1>
                    {/* Verified badge */}
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[11px] flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Verificado — Click Teleconsulta
                    </Badge>
                  </div>
                  <p className="text-base text-primary font-medium mt-0.5">{doctor.specialty}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 text-xs text-muted-foreground">
                    {doctor.crm && (
                      <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        <span>CRM: {doctor.crm} / {doctor.uf || 'BR'}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>Telemedicina (Online)</span>
                    </div>
                    {averageRating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{averageRating} ({reviews.length} avaliações)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
              <h2 className="text-base font-semibold text-foreground">Sobre o Especialista</h2>
              <div className="prose prose-sm max-w-none text-muted-foreground text-sm">
                {doctor.bio ? doctor.bio.split('\n').map((p, i) => <p key={i}>{p}</p>) : <p className="italic">O médico ainda não adicionou uma descrição profissional.</p>}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
              <h2 className="text-base font-semibold text-foreground">Instruções para Atendimento</h2>
              <div className="bg-blue-50/50 dark:bg-blue-950/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/20">
                <div className="prose prose-sm max-w-none text-foreground/80 text-sm">
                  {doctor.instructions
                    ? doctor.instructions.split('\n').map((p, i) => <p key={i}>{p}</p>)
                    : (
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>Conecte-se 5 minutos antes do horário agendado.</li>
                        <li>Certifique-se de estar em um local silencioso e iluminado.</li>
                        <li>Tenha seus documentos e exames anteriores em mãos, se necessário.</li>
                        <li>A tolerância de atraso é de 10 minutos.</li>
                      </ul>
                    )}
                </div>
              </div>
            </div>

            <ReviewsSection reviews={reviews} />
          </div>

          {/* Right column */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              <EmbeddedAppointmentForm doctor={doctor} />
              <div className="bg-muted/10 rounded-xl border border-dashed border-border p-5">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Info className="w-3 h-3" /> Suporte
                </h4>
                <p className="text-xs text-muted-foreground">
                  Dúvidas sobre o agendamento? Entre em contato através do{' '}
                  <Link to="/suporte" className="text-primary hover:underline font-semibold">canal de suporte</Link>.
                </p>
              </div>
            </div>
          </div>

          {isOwner && (
            <DoctorEditorDialog
              doctor={doctor}
              isOpen={isEditorOpen}
              onOpenChange={setIsEditorOpen}
              onSave={handleUpdateProfile}
            />
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <Helmet>
        <title>{doctor ? `${doctor.public_name || doctor.name} — ${doctor.specialty} | Click Teleconsulta` : 'Perfil do Médico - Click Teleconsulta'}</title>
        <meta name="description" content={doctor ? `Agende uma consulta online com ${doctor.public_name || doctor.name}, especialista em ${doctor.specialty}. Telemedicina segura e conveniente.` : "Veja o perfil do médico e agende sua consulta."} />
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
        {doctor && <>
          <meta property="og:title" content={`${doctor.public_name || doctor.name} — ${doctor.specialty}`} />
          <meta property="og:description" content={doctor.bio?.slice(0, 150) || `Especialista em ${doctor.specialty}. Agende sua teleconsulta agora.`} />
          <meta property="og:image" content={ogImage} />
          <meta property="og:type" content="profile" />
          <meta property="og:url" content={canonicalUrl} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={`${doctor.public_name || doctor.name} — ${doctor.specialty}`} />
          <meta name="twitter:description" content={`Teleconsulta com ${doctor.specialty} · Click Teleconsulta`} />
          <meta name="twitter:image" content={ogImage} />
        </>}
        {doctor && <PhysicianSchema doctor={doctor} />}
      </Helmet>

      <div className="container mx-auto px-4 py-6 md:py-8 min-h-screen">
        <div className="mb-5">
          <Button variant="ghost" className="pl-0 hover:pl-1 transition-all text-sm" onClick={() => navigate('/agendamentos')}>
            &larr; Voltar para lista de médicos
          </Button>
        </div>
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </div>
    </>
  );
};

export default DoctorPublicProfilePage;
