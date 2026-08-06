import React, { useState, useEffect, useCallback } from 'react';
import { painelDoPapel } from '@/lib/painelDoPapel';
import { Navigate, useLocation , useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Smartphone } from '@/components/ui/icones';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

// Portão de 2FA: se a conta exige aal2 e está em aal1, pede o código antes de liberar.
const TwoFactorGate = ({ children }) => {
  const [status, setStatus] = useState('checking'); // checking | ok | challenge
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();
  const { signOut } = useAuth();

  const check = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) { setStatus('ok'); return; }
      if (data && data.nextLevel === 'aal2' && data.currentLevel === 'aal1') setStatus('challenge');
      else setStatus('ok');
    } catch {
      setStatus('ok');
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  const verify = async (e) => {
    e.preventDefault();
    setVerifying(true);
    try {
      const { data: factors, error: fErr } = await supabase.auth.mfa.listFactors();
      if (fErr) throw fErr;
      const totp = (factors?.totp || []).find((f) => f.status === 'verified') || factors?.totp?.[0];
      if (!totp) throw new Error('Nenhum fator 2FA encontrado.');
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
      if (chErr) throw chErr;
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: totp.id, challengeId: ch.id, code: code.trim() });
      if (vErr) throw vErr;
      setStatus('ok');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Código inválido', description: err.message });
    } finally {
      setVerifying(false);
    }
  };

  if (status === 'checking') {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (status === 'challenge') {
    return (
      <div className="w-full flex justify-center items-center py-12 px-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <div className="p-3 rounded-full bg-primary/10">
                <Smartphone className="w-7 h-7 text-primary" />
              </div>
            </div>
            <CardTitle>Verificação em 2 etapas</CardTitle>
            <CardDescription>Digite o código do seu app autenticador para continuar.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={verify} className="space-y-4">
              <div className="space-y-1 text-left">
                <Label htmlFor="mfaCode">Código de verificação</Label>
                <Input
                  id="mfaCode"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  placeholder="000000"
                  autoFocus
                  className="text-center text-lg tracking-[0.4em] font-mono"
                />
              </div>
              <Button type="submit" className="w-full" disabled={verifying || code.length !== 6}>
                {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Verificar
              </Button>
              <button type="button" onClick={signOut} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
                Sair
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const navigate = useNavigate();
  const { session, loading, profile, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!session) {
    const targetRole = allowedRoles.includes('medico') ? 'medico' : 'paciente';
    const loginPath = `/acesso-${targetRole}`;
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // A ÚNICA SAÍDA DAQUI ERA SAIR DA CONTA. Quem chegasse por engano — e o
    // caminho mais comum era o próprio "Minha conta" do cabeçalho, que mandava
    // todo mundo para a área do paciente — só tinha o botão de encerrar a
    // sessão. Perder o login por ter clicado no lugar errado é punição
    // desproporcional, e fazia parecer que médico e admin não podiam navegar
    // pelo site.
    //
    // Agora as duas saídas naturais vêm primeiro: a área certa da pessoa e o
    // site público. Trocar de conta continua possível, mas deixou de ser a
    // única opção — e virou o botão discreto, que é o peso que ela merece.
    return (
        <div className="w-full flex justify-center items-center py-12">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle>Acesso restrito</CardTitle>
                    <CardDescription>
                        Esta área é exclusiva para {allowedRoles.join(' ou ')}.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                    <Button onClick={() => navigate(painelDoPapel(profile.role))}>
                      Ir para a minha área
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/')}>
                      Voltar ao site
                    </Button>
                    <Button variant="ghost" onClick={signOut} className="text-muted-foreground">
                      Sair e entrar com outra conta
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  return <TwoFactorGate>{children}</TwoFactorGate>;
};

export default ProtectedRoute;
