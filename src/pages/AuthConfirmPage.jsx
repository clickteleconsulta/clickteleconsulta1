import React, { useEffect, useState } from 'react';
import { BRAND } from '@/config/brand';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, AlertTriangle, MailCheck, CheckCircle2 } from '@/components/ui/icones';
import { Button } from '@/components/ui/button';

// Confirma o token do e-mail (invite / signup / recovery / magiclink / email_change)
// sem expor o domínio do projeto Supabase — o link do e-mail aponta para o próprio site.
//
// A troca de e-mail é o único tipo que NÃO termina num clique: o projeto está com
// "Secure email change" ligado, então o Supabase manda um link para o endereço novo e
// outro para o atual, e a troca só se efetiva depois dos dois. Antes, esta tela mandava
// direto para a home em todos os casos — quem confirmava o primeiro link via a home,
// não via e-mail nenhum ter mudado e concluía que o link estava quebrado. Por isso
// email_change agora tem tela própria, dizendo qual passo falta.
const AuthConfirmPage = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const [trocaEmail, setTrocaEmail] = useState(null); // { concluida, faltaConfirmar }

    useEffect(() => {
        const token_hash = params.get('token_hash');
        const type = params.get('type');
        const next = params.get('next') || '/';
        if (!token_hash || !type) { setError('Link inválido ou incompleto.'); return; }

        (async () => {
            const { error } = await supabase.auth.verifyOtp({ token_hash, type });
            if (error) { setError(error.message || 'Não foi possível validar o link.'); return; }

            if (type === 'email_change') {
                // `new_email` continua preenchido enquanto faltar a outra confirmação.
                const { data } = await supabase.auth.getUser();
                const pendente = data?.user?.new_email || '';
                setTrocaEmail(pendente
                    ? { concluida: false, faltaConfirmar: data?.user?.email || '' }
                    : { concluida: true, email: data?.user?.email || '' });
                return;
            }

            navigate(next, { replace: true });
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const moldura = (children) => (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 text-center">
            <Helmet><title>Confirmando — {BRAND.name}</title></Helmet>
            {children}
        </div>
    );

    if (error) {
        return moldura(
            <div className="max-w-sm flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7 text-red-500" />
                </div>
                <h1 className="text-lg font-bold text-slate-900">Link inválido ou expirado</h1>
                <p className="text-sm text-slate-500">{error}</p>
                <Button asChild variant="outline" className="mt-2"><Link to="/">Voltar ao início</Link></Button>
            </div>
        );
    }

    if (trocaEmail && !trocaEmail.concluida) {
        return moldura(
            <div className="max-w-md flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center">
                    <MailCheck className="w-7 h-7 text-brand-600" />
                </div>
                <h1 className="text-lg font-bold text-slate-900">Confirmado — falta 1 passo</h1>
                <p className="text-sm text-slate-500">
                    Por segurança, a troca de e-mail precisa ser confirmada nos dois endereços.
                    Falta abrir o link que enviamos para{' '}
                    <strong className="text-slate-700">{trocaEmail.faltaConfirmar}</strong>.
                </p>
                <p className="text-xs text-slate-400">
                    Enquanto isso, continue entrando com o e-mail atual — seu acesso não muda.
                </p>
                <Button asChild variant="outline" className="mt-2"><Link to="/">Voltar ao início</Link></Button>
            </div>
        );
    }

    if (trocaEmail?.concluida) {
        return moldura(
            <div className="max-w-md flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-green-600" />
                </div>
                <h1 className="text-lg font-bold text-slate-900">E-mail alterado</h1>
                <p className="text-sm text-slate-500">
                    A partir de agora, entre com <strong className="text-slate-700">{trocaEmail.email}</strong>.
                </p>
                <Button asChild className="mt-2"><Link to="/">Ir para o início</Link></Button>
            </div>
        );
    }

    return moldura(
        <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            <p className="text-sm text-slate-500">Validando seu link...</p>
        </div>
    );
};

export default AuthConfirmPage;
