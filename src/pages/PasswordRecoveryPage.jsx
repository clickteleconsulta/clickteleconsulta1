import React, { useState, useRef, useCallback } from 'react';
import { BRAND } from '@/config/brand';
import { useForm } from 'react-hook-form';
import AuthLayout from '@/components/auth/AuthLayout';
import TurnstileWidget, { TURNSTILE_ENABLED } from '@/components/auth/TurnstileWidget';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, MailCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet';

const PasswordRecoveryPage = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [captchaToken, setCaptchaToken] = useState('');
    const turnstileRef = useRef(null);
    const handleCaptcha = useCallback((token) => setCaptchaToken(token), []);
    const { toast } = useToast();

    const onSubmit = async ({ email }) => {
        if (TURNSTILE_ENABLED && !captchaToken) {
            toast({ variant: 'destructive', title: 'Confirmação necessária', description: 'Aguarde a verificação de segurança concluir e tente novamente.' });
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password`,
            captchaToken,
        });

        setLoading(false);
        if (TURNSTILE_ENABLED) { setCaptchaToken(''); turnstileRef.current?.reset(); }
        if (error) {
            toast({
                variant: "destructive",
                title: "Erro ao enviar e-mail",
                description: "Não foi possível enviar o link de recuperação. Verifique o e-mail e tente novamente.",
            });
        } else {
            setSubmitted(true);
        }
    };

    return (
        <>
            <Helmet>
                <title>{`Recuperar Senha · ${BRAND.name}`}</title>
                <meta name="description" content={`Recupere o acesso à sua conta na ${BRAND.name}. Insira seu e-mail para receber um link de redefinição de senha.`} />
            </Helmet>
            <AuthLayout variant="cliente">
                <Card className="w-full border-0 shadow-none">
                    <CardHeader className="px-0">
                        <CardTitle>Recuperar Senha</CardTitle>
                        <CardDescription>
                            {submitted 
                                ? "Verifique sua caixa de entrada (e spam)." 
                                : "Insira seu e-mail para receber um link para redefinir sua senha."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-0">
                        {submitted ? (
                            <div className="text-center py-8">
                                <MailCheck className="w-16 h-16 mx-auto text-green-500"/>
                                <p className="mt-4 text-muted-foreground">
                                    Se uma conta com este e-mail existir, um link de recuperação foi enviado.
                                </p>
                             </div>
                        ) : (
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div className="space-y-1">
                                    <Label htmlFor="email">E-mail</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        {...register("email", {
                                            required: "E-mail é obrigatório",
                                            pattern: {
                                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                message: "Endereço de e-mail inválido"
                                            }
                                        })}
                                        placeholder="seu@email.com"
                                        className={errors.email ? 'border-destructive' : ''}
                                    />
                                    {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                                </div>
                                <TurnstileWidget ref={turnstileRef} onVerify={handleCaptcha} />
                                <Button type="submit" className="w-full" disabled={loading || (TURNSTILE_ENABLED && !captchaToken)}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Link de Recuperação'}
                                 </Button>
                            </form>
                        )}
                    </CardContent>
                     <CardFooter className="px-0">
                         <Link to="/acesso-cliente" className="text-sm text-primary hover:underline w-full text-center">
                            Voltar para o login
                        </Link>
                     </CardFooter>
                </Card>
            </AuthLayout>
        </>
    );
};

export default PasswordRecoveryPage;