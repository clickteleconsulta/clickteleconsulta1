import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { BRAND } from '@/config/brand';
import { supabase } from '@/lib/customSupabaseClient';
import { PUBLIC_DOCTOR_COLUMNS } from '@/lib/publicDoctorColumns';
import { formatDoctorDisplayName } from '@/lib/doctorName';
import { slugify, doctorPath } from '@/lib/doctorSlug';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Star, CheckCircle2, User, Frown } from '@/components/ui/icones';
import VerificacaoTelefone from '@/components/VerificacaoTelefone';
import { cn } from '@/lib/utils';

const MIN_TEXTO = 50;
const VERSAO_DIRETRIZES = '0.1';

/**
 * Avaliação pública, sem conta.
 *
 * A ORDEM DOS PASSOS NÃO É ARBITRÁRIA
 * Nota → texto → identificação → confirmação do telefone. Pedir o telefone
 * antes de a pessoa ter escrito é pedir um dado pessoal antes de qualquer
 * vínculo, e é onde ela desiste. Deixando por último, quem chega ali já
 * investiu tempo escrevendo e completa.
 *
 * O QUE SUSTENTA A AVALIAÇÃO SEM LOGIN
 * Três coisas, e nenhuma sozinha basta: a declaração que a pessoa marca, o
 * telefone confirmado por código, e a moderação antes de publicar. A primeira
 * responsabiliza, a segunda encarece a fraude em escala, a terceira lê o que foi
 * escrito.
 *
 * ATENDIMENTO FORA DA PLATAFORMA
 * A avaliação é sobre o PROFISSIONAL, não sobre o canal do agendamento — quem
 * se consultou no consultório pode avaliar aqui. Isso precisa estar declarado
 * nos Termos, e é o que a tela diz em voz alta para não haver dúvida.
 */
const AvaliarPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [medico, setMedico] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const [nota, setNota] = useState(0);
  const [texto, setTexto] = useState('');
  const [nome, setNome] = useState('');
  const [local, setLocal] = useState('');
  const [aceito, setAceito] = useState(false);
  const [comprovante, setComprovante] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [pronto, setPronto] = useState(false);

  const buscar = useCallback(async () => {
    setCarregando(true);
    const { data } = await supabase
      .from('medicos')
      .select(PUBLIC_DOCTOR_COLUMNS)
      .eq('is_active', true)
      .eq('is_public', true);
    const achado = (data || []).find((d) => {
      const n = slugify(d.public_name || d.name);
      return `${n}-${slugify(d.specialty || '')}` === id || n === id || d.id === id;
    });
    setMedico(achado || null);
    setCarregando(false);
  }, [id]);

  useEffect(() => { buscar(); }, [buscar]);

  const enviar = async () => {
    setErro(''); setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke('avaliacao-publica', {
        body: {
          comprovante,
          medico_id: medico.id,
          rating: nota,
          comentario: texto.trim(),
          autor_nome: nome.trim(),
          local_atendimento: local,
          aceite_versao: VERSAO_DIRETRIZES,
        },
      });
      if (data?.error) throw new Error(data.error);
      if (error) throw new Error('Não foi possível enviar sua avaliação agora.');
      setPronto(true);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  if (carregando) {
    return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!medico) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <Frown className="w-10 h-10 mx-auto text-muted-foreground" />
        <h1 className="text-xl font-bold mt-4">Profissional não encontrado</h1>
        <p className="text-muted-foreground mt-2">O endereço pode estar incorreto ou o perfil não está mais disponível.</p>
        <Button asChild className="mt-6"><Link to="/agendamentos">Ver profissionais</Link></Button>
      </div>
    );
  }

  const nomeExibicao = formatDoctorDisplayName(medico.sexo, medico.public_name || medico.name);

  if (pronto) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <CheckCircle2 className="w-12 h-12 mx-auto text-green-600" />
        <h1 className="text-2xl font-bold mt-4">Avaliação enviada</h1>
        <p className="text-muted-foreground mt-2">
          Uma pessoa da nossa equipe lê antes de publicar, normalmente em até dois dias úteis.
          Se não puder ir ao ar, você recebe o motivo.
        </p>
        <Button asChild className="mt-6">
          <Link to={doctorPath(medico)}>Ver o perfil de {nomeExibicao}</Link>
        </Button>
      </div>
    );
  }

  const textoOk = texto.trim().length >= MIN_TEXTO;
  const podeVerificar = nota > 0 && textoOk && nome.trim() && local && aceito;

  return (
    <>
      <Helmet>
        <title>Avaliar {nomeExibicao} — {BRAND.name}</title>
        {/* Página de formulário: não deve concorrer com o perfil na busca. */}
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Avatar className="w-12 h-12">
            <AvatarImage src={medico.image_url} className="object-cover" />
            <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-bold text-lg leading-tight">Você foi atendido por {nomeExibicao}?</h1>
            <p className="text-sm text-muted-foreground">{medico.specialty} · seu relato ajuda quem está escolhendo agora</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 space-y-6">
          {/* 1 — nota */}
          <div>
            <Label className="mb-2 block">Que nota você dá ao atendimento?</Label>
            <div className="flex gap-1" role="radiogroup" aria-label="Nota de 1 a 5 estrelas">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={nota === n}
                  aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
                  onClick={() => setNota(n)}
                  className="p-1 rounded transition-transform hover:scale-110"
                >
                  <Star className={cn('w-8 h-8', n <= nota ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
                </button>
              ))}
            </div>
          </div>

          {/* 2 — texto */}
          <div>
            <Label htmlFor="av-texto">O que alguém precisa saber antes de marcar com ele?</Label>
            <Textarea
              id="av-texto"
              rows={5}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Ele respeitou o horário? Explicou de um jeito que deu para entender? Você saiu sabendo o que fazer?"
              className="mt-1.5"
            />
            <p className={cn('text-xs mt-1', textoOk ? 'text-muted-foreground' : 'text-amber-700')}>
              {textoOk
                ? `${texto.trim().length} caracteres`
                : `Escreva mais ${MIN_TEXTO - texto.trim().length} caracteres. Relato de uma linha não ajuda ninguém a decidir.`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Isto fica visível para qualquer pessoa na internet. Não coloque telefone, e-mail, CPF nem resultado de exame.
            </p>
          </div>

          {/* 3 — identificação */}
          <div>
            <Label htmlFor="av-nome">Como você quer assinar</Label>
            <Input
              id="av-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Maria S."
              maxLength={60}
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">É o que aparece junto do seu relato. Primeiro nome e a inicial do sobrenome bastam.</p>
          </div>

          {/* 4 — onde foi */}
          <div>
            <Label className="mb-2 block">Onde esse atendimento aconteceu?</Label>
            <div className="grid sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Onde o atendimento aconteceu">
              {[
                { valor: 'teleconsulta', rotulo: 'Teleconsulta', ajuda: 'Foi à distância, por vídeo, telefone ou mensagem' },
                { valor: 'presencial', rotulo: 'Presencial com o profissional', ajuda: 'Você esteve com ele pessoalmente' },
              ].map((opcao) => (
                <button
                  key={opcao.valor}
                  type="button"
                  role="radio"
                  aria-checked={local === opcao.valor}
                  onClick={() => setLocal(opcao.valor)}
                  className={cn(
                    'text-left rounded-md border p-3 transition-colors',
                    local === opcao.valor
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:bg-muted/40',
                  )}
                >
                  <span className="block text-sm font-medium text-foreground">{opcao.rotulo}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{opcao.ajuda}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Quem lê merece saber de que tipo de atendimento você está falando — as duas coisas são diferentes,
              e a nota faz sentidos diferentes em cada uma.
            </p>
          </div>

          {/* 5 — a declaração */}
          <label className="flex gap-3 items-start cursor-pointer rounded-md border border-border p-3 hover:bg-muted/40">
            <input
              type="checkbox"
              checked={aceito}
              onChange={(e) => setAceito(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--primary)]"
            />
            <span className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Declaro que fui atendido por este profissional</strong> e que o
              relato acima é meu, escrito por mim. Ninguém me pagou nem me ofereceu desconto, brinde ou qualquer
              vantagem por ele. Autorizo a {BRAND.name} a publicar este texto e a tratar meus dados para essa
              finalidade, conforme as{' '}
              <Link to="/diretrizes-de-avaliacao" className="underline" target="_blank" rel="noopener noreferrer">
                Diretrizes de Avaliação
              </Link>{' '}
              e a{' '}
              <Link to="/legal?doc=privacy_policy" className="underline" target="_blank" rel="noopener noreferrer">
                Política de Privacidade
              </Link>.
            </span>
          </label>

          <p className="text-xs text-muted-foreground border-t border-border pt-4">
            Você não precisa ter marcado por aqui. A avaliação é sobre o profissional — se o atendimento
            veio por outro caminho, ele conta do mesmo jeito.
          </p>

          {/* 5 — telefone, por último de propósito */}
          {podeVerificar ? (
            comprovante ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Telefone confirmado.
                </div>
                <Button onClick={enviar} disabled={enviando} className="w-full" size="lg">
                  {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar minha avaliação'}
                </Button>
              </div>
            ) : (
              <div className="border-t border-border pt-4">
                <VerificacaoTelefone
                  finalidade="avaliacao"
                  aoConfirmar={setComprovante}
                  titulo="Falta confirmar que é você"
                  explicacao="Um código rápido, e a avaliação segue para revisão. É o que impede alguém de inventar dez relatos sobre o mesmo profissional."
                />
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground border-t border-border pt-4">
              Falta completar os campos acima para seguir.
            </p>
          )}

          {erro && <p className="text-sm text-red-600" role="alert">{erro}</p>}
        </div>

        <button
          type="button"
          onClick={() => navigate(doctorPath(medico))}
          className="text-sm text-muted-foreground hover:text-foreground underline mt-4 block mx-auto"
        >
          Voltar ao perfil
        </button>
      </div>
    </>
  );
};

export default AvaliarPage;
