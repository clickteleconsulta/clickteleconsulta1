import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, MessageCircle } from '@/components/ui/icones';

/**
 * Confirmação de telefone por código, em duas etapas.
 *
 * Usada no cadastro do paciente e na avaliação pública. As duas telas pedem a
 * mesma coisa e erram do mesmo jeito, então o componente é um só — o que muda é
 * a `finalidade`, que o servidor usa para separar os códigos e decidir o que
 * fazer ao confirmar.
 *
 * O QUE ELE DEVOLVE
 * `aoConfirmar(comprovante)` recebe o comprovante de verificação, que vale 30
 * minutos e uma vez. Na finalidade "cadastro" ele pode ser ignorado: o servidor
 * já marcou o perfil como verificado. Na avaliação é ele que autoriza a
 * gravação.
 *
 * MÁSCARA E NORMALIZAÇÃO
 * A máscara aqui é só conforto de leitura. Quem decide o que é um número válido
 * é o servidor, que normaliza para E.164 antes de qualquer coisa — porque é o
 * hash desse número normalizado que impede a mesma pessoa de avaliar duas
 * vezes, e três grafias do mesmo telefone dariam três hashes.
 */
const mascara = (valor) => {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const VerificacaoTelefone = ({
  finalidade,
  aoConfirmar,
  email,
  telefoneInicial = '',
  titulo = 'Confirmação por mensagem',
  explicacao = 'Digite seu celular para receber um código por WhatsApp. É rápido.',
}) => {
  const [telefone, setTelefone] = useState(mascara(telefoneInicial));
  const [codigo, setCodigo] = useState('');
  const [etapa, setEtapa] = useState('telefone'); // telefone → codigo → pronto
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const chamar = async (corpo) => {
    const { data, error } = await supabase.functions.invoke('verificar-telefone', { body: corpo });
    // A função devolve o motivo no corpo mesmo quando o status não é 2xx; sem
    // ler o corpo, a pessoa veria "Edge Function returned a non-2xx status
    // code", que não diz nada a ninguém.
    if (data?.error) throw new Error(data.error);
    if (error) throw new Error(data?.error || 'Não foi possível completar agora.');
    return data;
  };

  const enviar = async () => {
    setErro(''); setAviso(''); setOcupado(true);
    try {
      const r = await chamar({ acao: 'enviar', telefone, finalidade, email });
      setEtapa('codigo');
      if (r?.enviado === false) {
        // Estado real e honesto: a linha existe, o código foi gerado, mas o
        // WhatsApp não está configurado. Dizer "enviamos" seria mentira, e a
        // pessoa ficaria esperando uma mensagem que não vem.
        setAviso('O envio por WhatsApp ainda não está ativo nesta instalação. Fale com o suporte.');
      }
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  };

  const conferir = async () => {
    setErro(''); setOcupado(true);
    try {
      const r = await chamar({ acao: 'conferir', telefone, codigo, finalidade });
      setEtapa('pronto');
      aoConfirmar?.(r.comprovante);
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  };

  if (etapa === 'pronto') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        Telefone confirmado.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          {titulo}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{explicacao}</p>
      </div>

      {etapa === 'telefone' ? (
        <div className="space-y-2">
          <Label htmlFor="vt-telefone">Seu celular com DDD</Label>
          <div className="flex gap-2">
            <span className="inline-flex items-center rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground">
              +55
            </span>
            <Input
              id="vt-telefone"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(21) 99999-8888"
              value={telefone}
              onChange={(e) => setTelefone(mascara(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && !ocupado && enviar()}
            />
          </div>
          <Button type="button" onClick={enviar} disabled={ocupado || telefone.replace(/\D/g, '').length < 11} className="w-full">
            {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Receber código'}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="vt-codigo">Código de 6 dígitos</Label>
          <Input
            id="vt-codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && !ocupado && conferir()}
            className="text-center text-lg tracking-[0.4em] font-mono"
          />
          <Button type="button" onClick={conferir} disabled={ocupado || codigo.length !== 6} className="w-full">
            {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
          </Button>
          <button
            type="button"
            onClick={() => { setEtapa('telefone'); setCodigo(''); setErro(''); }}
            className="text-xs text-muted-foreground hover:text-foreground underline w-full text-center"
          >
            Corrigir o número
          </button>
        </div>
      )}

      {aviso && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">{aviso}</p>}
      {erro && <p className="text-sm text-red-600" role="alert">{erro}</p>}
      <p className="text-[11px] text-muted-foreground">
        Usamos seu número só para esta confirmação e para evitar avaliação falsa. Ele não é publicado.
      </p>
    </div>
  );
};

export default VerificacaoTelefone;
