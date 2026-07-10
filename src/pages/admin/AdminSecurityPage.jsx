import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, KeyRound, Eye, EyeOff, ShieldCheck, Smartphone, Copy } from 'lucide-react';

const AdminSecurityPage = () => {
  const { toast } = useToast();

  // ── Senha ──────────────────────────────────────────────
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({ variant: 'destructive', title: 'Senha muito curta', description: 'Use pelo menos 8 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'As senhas não coincidem', description: 'Confirme a mesma senha nos dois campos.' });
      return;
    }
    setSavingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Senha alterada!', description: 'Sua nova senha já está ativa.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao alterar senha', description: err.message });
    } finally {
      setSavingPwd(false);
    }
  };

  // ── 2FA (TOTP) ─────────────────────────────────────────
  const [loadingMfa, setLoadingMfa] = useState(true);
  const [factor, setFactor] = useState(null);         // fator verificado (2FA ativo)
  const [enrolling, setEnrolling] = useState(false);
  const [enrollData, setEnrollData] = useState(null); // { factorId, qrCode, secret }
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const loadFactors = useCallback(async () => {
    setLoadingMfa(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const verified = (data?.totp || []).find((f) => f.status === 'verified');
      setFactor(verified || null);
    } catch {
      setFactor(null);
    } finally {
      setLoadingMfa(false);
    }
  }, []);

  useEffect(() => { loadFactors(); }, [loadFactors]);

  const startEnroll = async () => {
    setEnrolling(true);
    try {
      // remove fatores pendentes (não verificados) para evitar conflito
      const { data: list } = await supabase.auth.mfa.listFactors();
      const pending = (list?.totp || []).filter((f) => f.status === 'unverified');
      for (const p of pending) { await supabase.auth.mfa.unenroll({ factorId: p.id }); }

      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Autenticador' });
      if (error) throw error;
      setEnrollData({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
      setCode('');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao iniciar 2FA', description: err.message });
    } finally {
      setEnrolling(false);
    }
  };

  const verifyEnroll = async (e) => {
    e.preventDefault();
    if (!enrollData) return;
    setVerifying(true);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enrollData.factorId });
      if (chErr) throw chErr;
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: enrollData.factorId, challengeId: ch.id, code: code.trim() });
      if (vErr) throw vErr;
      toast({ title: '2FA ativado!', description: 'Autenticação de 2 fatores ativada com sucesso.' });
      setEnrollData(null);
      setCode('');
      await loadFactors();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Código inválido', description: err.message });
    } finally {
      setVerifying(false);
    }
  };

  const disable2fa = async () => {
    if (!factor) return;
    setDisabling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (error) throw error;
      toast({ title: '2FA desativado', description: 'A autenticação de 2 fatores foi removida.' });
      await loadFactors();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao desativar', description: err.message });
    } finally {
      setDisabling(false);
    }
  };

  const copySecret = () => {
    if (!enrollData?.secret) return;
    navigator.clipboard.writeText(enrollData.secret);
    toast({ title: 'Código copiado', description: 'Cole no seu app autenticador.' });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Segurança</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie a senha e a autenticação de 2 fatores desta conta.</p>
      </div>

      {/* Alterar Senha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="w-5 h-5 text-primary" /> Alterar Senha
          </CardTitle>
          <CardDescription>Defina uma nova senha de acesso ao painel (mínimo 8 caracteres).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="grid gap-4 max-w-md">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-xs font-bold text-gray-700 uppercase tracking-wide">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-bold text-gray-700 uppercase tracking-wide">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
              />
            </div>
            <div>
              <Button type="submit" disabled={savingPwd || !newPassword || !confirmPassword} className="min-w-[150px]">
                {savingPwd ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                Alterar Senha
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Autenticação de 2 Fatores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="w-5 h-5 text-primary" /> Autenticação de 2 Fatores (2FA)
          </CardTitle>
          <CardDescription>
            Adicione uma camada extra de segurança com um app autenticador (Google Authenticator, Authy, 1Password).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingMfa ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Verificando status...
            </div>
          ) : factor ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-green-50 border border-green-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">2FA ativado</p>
                  <p className="text-xs text-green-700">Você precisará do código do app ao entrar no painel.</p>
                </div>
              </div>
              <Button variant="outline" onClick={disable2fa} disabled={disabling}
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                {disabling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Desativar
              </Button>
            </div>
          ) : enrollData ? (
            <div className="space-y-5">
              <p className="text-sm text-gray-600">
                <strong>1.</strong> Escaneie o QR Code com seu app autenticador (ou insira o código manual).
              </p>
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
                  {String(enrollData.qrCode).trim().startsWith('<svg')
                    ? <div className="w-40 h-40" dangerouslySetInnerHTML={{ __html: enrollData.qrCode }} />
                    : <img src={enrollData.qrCode} alt="QR Code 2FA" className="w-40 h-40" />}
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Código manual</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 break-all font-mono">{enrollData.secret}</code>
                    <Button type="button" variant="outline" size="icon" onClick={copySecret} className="shrink-0">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <form onSubmit={verifyEnroll} className="space-y-3 max-w-xs">
                <p className="text-sm text-gray-600"><strong>2.</strong> Digite o código de 6 dígitos gerado pelo app.</p>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-gray-400" />
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    placeholder="000000"
                    className="tracking-[0.3em] text-center font-mono"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={verifying || code.length !== 6}>
                    {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    Verificar e ativar
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setEnrollData(null)}>Cancelar</Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">2FA desativado</p>
                  <p className="text-xs text-gray-500">Sua conta está protegida apenas por senha.</p>
                </div>
              </div>
              <Button onClick={startEnroll} disabled={enrolling}>
                {enrolling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Ativar 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSecurityPage;
