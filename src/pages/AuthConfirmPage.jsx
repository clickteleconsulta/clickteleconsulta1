import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Confirma o token do e-mail (invite / signup / recovery / magiclink / email_change)
// sem expor o domínio do projeto Supabase — o link do e-mail aponta para o próprio site.
const AuthConfirmPage = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState(null);

    useEffect(() => {
        const token_hash = params.get('token_hash');
        const type = params.get('type');
        const next = params.get('next') || '/';
        if (!token_hash || !type) { setError('Link inválido ou incompleto.'); return; }

        (async () => {
            const { error } = await supabase.auth.verifyOtp({ token_hash, type });
            if (error) { setError(error.message || 'Não foi possível validar o link.'); return; }
            navigate(next, { replace: true });
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 text-center">
            <Helmet><title>Confirmando — Click Teleconsulta</title></Helmet>
            {error ? (
                <div className="max-w-sm flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                        <AlertTriangle className="w-7 h-7 text-red-500" />
                    </div>
                    <h1 className="text-lg font-bold text-slate-900">Link inválido ou expirado</h1>
                    <p className="text-sm text-slate-500">{error}</p>
                    <Button asChild variant="outline" className="mt-2"><Link to="/">Voltar ao início</Link></Button>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-sm text-slate-500">Validando seu link...</p>
                </div>
            )}
        </div>
    );
};

export default AuthConfirmPage;
