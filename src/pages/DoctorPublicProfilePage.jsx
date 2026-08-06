import React, { useCallback, useEffect, useState } from 'react';
import { BRAND } from '@/config/brand';
import { formatDoctorDisplayName } from '@/lib/doctorName';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { PUBLIC_DOCTOR_COLUMNS } from '@/lib/publicDoctorColumns';
import { supabase } from '@/lib/customSupabaseClient';
import { toSiteUrl } from '@/lib/storageUrl';
import { Loader2, Frown, Star, MapPin, Shield, Pencil, Save, Info, MessageCircle, CheckCircle2, Phone, Calendar, ChevronDown } from '@/components/ui/icones';
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
import Estrelas from '@/components/Estrelas';
import { DoctorScheduleCard } from '@/components/DoctorScheduleCard';
import { slugify, doctorPath } from '@/lib/doctorSlug';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// A regra do slug vive em @/lib/doctorSlug (importado acima): o canonical desta
// página, o link do card da listagem e o sitemap precisam gerar o MESMO endereço.

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
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
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
    <div id="avaliacoes" className="bg-card rounded-md border border-border shadow-sm p-5 space-y-4 scroll-mt-24">
      <div className="flex items-start justify-between">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          Avaliações
        </h3>
        {averageRating && (
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{averageRating}</div>
            {/* Mesmo componente do card da listagem: sem isso, o mesmo médico
                aparecia com estrelas diferentes aqui e lá — aqui a vazia era
                contornada, lá era cinza cheia, e as duas arredondavam. */}
            <Estrelas nota={Number(averageRating)} tamanho={12} className="justify-end mt-0.5" />
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
        // "Este profissional ainda não possui avaliações visíveis" constatava
        // uma falta e a pendurava no médico — quem lê entende que faltou algo
        // com ELE, quando na verdade a plataforma é que ainda é nova. O selo
        // nomeia o estado e a frase diz o que vai acontecer.
        //
        // O selo vive AQUI e não no card de agendamento: nos cards ele estaria
        // em todos os médicos ao mesmo tempo, deixaria de distinguir alguém e
        // viraria o anúncio de que a lista está vazia. Dentro do perfil ele
        // aparece uma vez só, no lugar exato onde a pergunta surge.
        //
        // Cinza dos tokens neutros de propósito: descreve a ausência de um
        // dado, não uma credencial. Em cobalto ou jade ficaria ao lado do selo
        // de verificado parecendo um segundo mérito.
        <div className="text-center py-6 bg-muted/20 rounded-md border border-dashed">
          <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            Novo na plataforma
          </span>
          <p className="text-muted-foreground text-sm mt-2">
            As avaliações aparecem assim que os primeiros pacientes forem atendidos.
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Caixa de agendamento ──────────────────────────────────────────────────────
/**
 * A caixa "Agendar Consulta".
 *
 * DUAS VERSÕES, E O MOTIVO É LARGURA.
 *
 * `comAgenda` abre a grade de horários ali mesmo, sem sair da página — é a
 * versão que aparece até 1023px, onde a caixa ocupa a linha inteira. Quem chega
 * pelo link compartilhado cai no celular, e mandar essa pessoa para
 * /agendamentos só para descobrir se existe horário era um desvio que ela não
 * precisava fazer.
 *
 * A partir de lg a caixa vive na coluna lateral, com ~380px. A grade do cartão
 * abre cinco dias lado a lado nessa faixa (o `sm:grid-cols-5` responde à
 * LARGURA DA JANELA, não à do contêiner), o que daria colunas de ~65px. Ali a
 * caixa segue levando para /agendamentos, onde a grade tem a largura de que
 * precisa.
 *
 * A grade é o `DoctorScheduleCard` em modo `somenteAgenda`, e não uma segunda
 * implementação: agendar daqui passa exatamente pelo mesmo caminho de
 * /agendamentos — mesma checagem de horário ocupado em tempo real, mesmo
 * checkout, mesmo tratamento de visitante não logado.
 */
const EmbeddedAppointmentForm = ({ doctor, comAgenda = false }) => {
  const [agendaAberta, setAgendaAberta] = useState(false);

  return (
  <div className="bg-card rounded-md border border-border shadow-sm p-6 flex flex-col gap-4">
    <h3 className="font-bold text-lg text-foreground">Agendar Consulta</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      {comAgenda
        ? 'Abra a agenda abaixo, escolha um horário e conclua o agendamento em poucos minutos.'
        : 'Clique no botão abaixo para ver os horários disponíveis e concluir seu agendamento online em poucos minutos.'}
    </p>
    {comAgenda ? (
      <>
        <Button
          type="button"
          onClick={() => setAgendaAberta((v) => !v)}
          aria-expanded={agendaAberta}
          aria-controls={`agenda-perfil-${doctor?.id}`}
          className="w-full bg-primary hover:bg-primary/90 font-bold py-6"
        >
          <Calendar className="w-4 h-4 mr-2" />
          {agendaAberta ? 'Ocultar horários' : 'Ver Horários Disponíveis'}
          <ChevronDown className={cn('w-4 h-4 ml-2 transition-transform duration-200', agendaAberta && 'rotate-180')} />
        </Button>
        {/* Montada só depois do clique. Fechada, ela não busca agenda nem abre
            a escuta de horário ocupado — a caixa da barra lateral fica no DOM
            junto com esta, e duas grades vivas seriam duas vezes o mesmo
            trabalho na mesma página. */}
        {agendaAberta && (
          <div id={`agenda-perfil-${doctor?.id}`} className="border-t border-border pt-4">
            <DoctorScheduleCard initialDoctor={doctor} somenteAgenda />
          </div>
        )}
      </>
    ) : (
      <Button asChild className="w-full bg-primary hover:bg-primary/90 font-bold py-6">
        <Link to="/agendamentos">
          <Calendar className="w-4 h-4 mr-2" /> Ver Horários Disponíveis
        </Link>
      </Button>
    )}
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
      <span>Pagamento por Pix ou cartão · Dados protegidos (LGPD)</span>
    </div>
  </div>
  );
};

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
          <div className="flex items-center justify-between bg-brand-50 rounded-lg p-3 border">
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
      const { data, error } = await supabase.from('medicos').select(PUBLIC_DOCTOR_COLUMNS).eq('id', id).eq('is_active', true).single();
      if (error || !data) throw new Error("Médico não encontrado.");
      doctorData = data;
    } else {
      // Slug lookup: try to match public_name + specialty
      const { data, error } = await supabase.from('medicos').select(PUBLIC_DOCTOR_COLUMNS).eq('is_active', true);
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
  // O MESMO cartão que o prerender gera em tools/og-medicos.mjs. Esta tag aqui
  // é escrita por JavaScript e o robô do WhatsApp não a enxerga — quem manda na
  // prévia é o HTML de dist/medico/<slug>/index.html. Ela existe para os
  // leitores que rodam JS não verem uma imagem diferente da que o link mostra.
  const slugDoCartao = doctor ? doctorPath(doctor).replace('/medico/', '') : '';
  const ogImage = doctor
    ? `${BRAND.url}/og/medico/${slugDoCartao}.png`
    : `${BRAND.url}/og-image-v3.png`;
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
            <div className="bg-card rounded-md border border-border shadow-sm overflow-hidden">
              <div className="h-24 bg-primary w-full" />
              <div className="px-5 pb-5 relative">
                <div className="flex justify-between items-end -mt-12 mb-3">
                  <Avatar className="w-24 h-24 border-4 border-background shadow-md bg-white">
                    <AvatarImage src={toSiteUrl(doctor.image_url)} alt={doctor.public_name} className="object-cover" />
                    <AvatarFallback className="text-2xl">{doctor.public_name?.[0] || 'M'}</AvatarFallback>
                  </Avatar>
                  {isOwner && (
                    <Button onClick={() => setIsEditorOpen(true)} variant="outline" size="sm" className="gap-2 h-8 text-xs">
                      <Pencil className="w-3 h-3" /> Editar Perfil
                    </Button>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl md:text-2xl font-bold text-foreground">{formatDoctorDisplayName(doctor.sexo, doctor.public_name || doctor.name)}</h1>
                    {/* Verified badge */}
                    <Badge className="bg-brand-100 text-brand-800 border-brand-200 text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Verificado — {BRAND.name}
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

            {/* AGENDAR VEM ANTES DE LER SOBRE O MÉDICO — no celular.
                Até lg a barra lateral desce para o fim da página, e a caixa de
                agendamento ia junto: quem abria o link compartilhado precisava
                rolar a bio inteira, a formação e as instruções para descobrir
                que existia um botão. Quem chega por um link de perfil já
                escolheu o médico; o que falta é o horário.
                No lg ela some daqui e reaparece na coluna lateral, que a essa
                altura está visível ao lado do topo da página. */}
            <div className="lg:hidden">
              <EmbeddedAppointmentForm doctor={doctor} comAgenda />
            </div>

            {/* Bio */}
            <div className="bg-card rounded-md border border-border shadow-sm p-5 space-y-3">
              <h2 className="text-base font-semibold text-foreground">Sobre o Profissional</h2>
              <div className="prose prose-sm max-w-none text-muted-foreground text-sm">
                {doctor.bio ? doctor.bio.split('\n').map((p, i) => <p key={i}>{p}</p>) : <p className="italic">O médico ainda não adicionou uma descrição profissional.</p>}
              </div>
            </div>

            {/* Formação */}
            {doctor.formacao && (
              <div className="bg-card rounded-md border border-border shadow-sm p-5 space-y-3">
                <h2 className="text-base font-semibold text-foreground">Formação</h2>
                <div className="prose prose-sm max-w-none text-muted-foreground text-sm">
                  {doctor.formacao.split('\n').map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-card rounded-md border border-border shadow-sm p-5 space-y-3">
              <h2 className="text-base font-semibold text-foreground">Instruções para Atendimento</h2>
              <div className="bg-brand-50/50 dark:bg-brand-800/10 p-4 rounded-lg border border-brand-100 dark:border-brand-800/20">
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
              <div className="hidden lg:block">
                <EmbeddedAppointmentForm doctor={doctor} />
              </div>
              <div className="bg-card rounded-md border border-border shadow-sm p-5">
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
        <title>{doctor ? `${doctor.public_name || doctor.name} — ${doctor.specialty} | ${BRAND.name}` : `Perfil do Médico · ${BRAND.name}`}</title>
        <meta name="description" content={doctor ? `Agende uma consulta online com ${doctor.public_name || doctor.name}, profissional em ${doctor.specialty}. Agendamento pela ${BRAND.name}, ${BRAND.tagline.toLowerCase()}.` : "Veja o perfil do médico e agende sua consulta."} />
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
        {doctor && <meta property="og:title" content={`${doctor.public_name || doctor.name} — ${doctor.specialty}`} />}
        {doctor && <meta property="og:description" content={doctor.bio?.slice(0, 150) || `Profissional em ${doctor.specialty}. Agende sua teleconsulta agora.`} />}
        {doctor && <meta property="og:image" content={ogImage} />}
        {doctor && <meta property="og:type" content="profile" />}
        {doctor && <meta property="og:url" content={canonicalUrl} />}
        {doctor && <meta name="twitter:card" content="summary_large_image" />}
        {doctor && <meta name="twitter:title" content={`${doctor.public_name || doctor.name} — ${doctor.specialty}`} />}
        {doctor && <meta name="twitter:description" content={`Teleconsulta com ${doctor.specialty} · ${BRAND.name}`} />}
        {doctor && <meta name="twitter:image" content={ogImage} />}
      </Helmet>
      {doctor && <PhysicianSchema doctor={doctor} />}

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
