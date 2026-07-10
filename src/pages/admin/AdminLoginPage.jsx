import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Lock, Loader2, Smartphone } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useLoader } from '@/contexts/LoaderContext';

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const { signIn, user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { showLoader, hideLoader } = useLoader();

  // Redireciona sessão já autenticada — respeitando 2FA (não navega em aal1 pendente)
  useEffect(() => {
    if (user && profile?.role === 'admin') {
      supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        .then(({ data }) => {
          if (data && data.nextLevel === 'aal2' && data.currentLevel === 'aal1') {
            setMfaStep(true);
          } else {
            navigate('/admin/dashboard/agendamentos');
          }
        })
        .catch(() => navigate('/admin/dashboard/agendamentos'));
    }
  }, [user, profile, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    showLoader();

    try {
      const { error } = await signIn(email, password);
      if (error) throw error;

      // Verifica papel
      const { data: profileCheck } = await supabase
        .from('perfis_usuarios')
        .select('role')
        .eq('email', email)
        .single();

      if (profileCheck?.role !== 'admin') {
        throw new Error('Acesso não autorizado. Apenas administradores.');
      }

      // 2FA: exige código se houver fator verificado
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
        setMfaStep(true);
        hideLoader();
        return;
      }

      navigate('/admin/dashboard/agendamentos');
      setTimeout(() => hideLoader(), 1000);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro de acesso',
        description: error.message || 'Credenciais inválidas ou sem permissão.',
      });
      await supabase.auth.signOut();
      hideLoader();
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaVerify = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    showLoader();

    try {
      const { data: factors, error: fErr } = await supabase.auth.mfa.listFactors();
      if (fErr) throw fErr;
      const totp = (factors?.totp || []).find((f) => f.status === 'verified') || factors?.totp?.[0];
      if (!totp) throw new Error('Nenhum fator 2FA encontrado.');

      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
      if (chErr) throw chErr;

      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: totp.id, challengeId: ch.id, code: mfaCode.trim() });
      if (vErr) throw vErr;

      navigate('/admin/dashboard/agendamentos');
      setTimeout(() => hideLoader(), 1000);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Código inválido', description: error.message });
      hideLoader();
    } finally {
      setIsLoading(false);
    }
  };

  const cancelMfa = async () => {
    await supabase.auth.signOut();
    setMfaStep(false);
    setMfaCode('');
    setPassword('');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-950 text-slate-100">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-slate-900 border border-slate-800">
              {mfaStep ? <Smartphone className="w-8 h-8 text-slate-100" /> : <Lock className="w-8 h-8 text-slate-100" />}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            {mfaStep ? 'Verificação em 2 etapas' : 'Acesso Administrativo'}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {mfaStep ? 'Digite o código do seu app autenticador' : 'Área restrita para gestão da plataforma'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!mfaStep ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:ring-slate-700"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-white focus:ring-slate-700"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-white text-slate-950 hover:bg-slate-200 font-semibold"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Entrar'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mfaCode" className="text-slate-200">Código de verificação</Label>
                <Input
                  id="mfaCode"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  placeholder="000000"
                  autoFocus
                  required
                  className="bg-slate-900 border-slate-800 text-white text-center text-lg tracking-[0.4em] font-mono focus:ring-slate-700"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-white text-slate-950 hover:bg-slate-200 font-semibold"
                disabled={isLoading || mfaCode.length !== 6}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Verificar'}
              </Button>
              <button type="button" onClick={cancelMfa} className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors">
                Voltar ao login
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLoginPage;
