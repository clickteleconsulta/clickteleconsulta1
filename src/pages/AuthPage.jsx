import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { cn } from "@/lib/utils";
import { IMaskInput } from 'react-imask';
import { trackSignup } from '@/lib/analytics';
import { useLoader } from '@/contexts/LoaderContext';
import { Checkbox } from '@/components/ui/checkbox';

// Masked Input Component for CPF and Phone
const MaskedInput = React.forwardRef(({ mask, onChange, value, ...props }, ref) => (
  <IMaskInput
    mask={mask}
    value={value || ''}
    inputRef={ref}
    onAccept={(val) => onChange({ target: { name: props.name, value: val } })}
    overwrite
    className={cn(
      "flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 text-gray-900",
      props.className
    )}
    placeholder={props.placeholder}
    {...props}
  />
));

const AuthPage = ({
  targetRole = 'paciente'
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    signIn,
    signUp,
    signInWithGoogle
  } = useAuth();
  const { toast } = useToast();
  const { showLoader, hideLoader } = useLoader();
  const isDoctor = targetRole === 'medico';

  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Extra fields for patient signup
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [sexo, setSexo] = useState('');

  // LGPD consent (HOTFIX-05)
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    if (isDoctor) {
      setIsLogin(true);
    }
  }, [isDoctor]);
  
  // Helper to handle post-login redirects.
  // NÃO navegar imperativamente aqui: o componente AuthRedirect (que renderiza esta página em
  // /acesso-paciente e /acesso-medico) redireciona por papel assim que sessão + perfil carregam
  // — paciente → /paciente/dashboard (→ consultas), médico → /medico/dashboard, admin → /admin/dashboard.
  // O antigo navigate('/') / '/patient/consultations' quebrava esse fluxo, jogando o paciente na home.
  const handlePostAuthRedirect = () => {
    // Apenas esconder o loader; o AuthRedirect assume o roteamento correto.
    setTimeout(() => {
      hideLoader();
    }, 1000);
  };

  // BONUS-01: CPF validation with check digits
  const isValidCPF = (cpfValue) => {
    const cleaned = cpfValue.replace(/\D/g, '');
    if (cleaned.length !== 11 || /^(\d)\1+$/.test(cleaned)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i]) * (10 - i);
    let rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    if (rest !== parseInt(cleaned[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i]) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    return rest === parseInt(cleaned[10]);
  };

  const handleAuth = async e => {
    e.preventDefault();
    setIsLoading(true);
    showLoader();

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        
        handlePostAuthRedirect();

      } else {
        // Validation for Patient Signup
        if (!isDoctor) {
             if (!fullName?.trim() || !cpf || !whatsapp || !birthDate || !sexo || !email?.trim() || !password) {
                throw new Error("Preencha todos os campos obrigatórios.");
             }

             // BONUS-01: CPF digit validation
             if (!isValidCPF(cpf)) {
               throw new Error("CPF inválido. Verifique os dígitos e tente novamente.");
             }

             // Apenas maiores de 18 anos podem se cadastrar
             {
               const birth = new Date(birthDate);
               const now = new Date();
               let age = now.getFullYear() - birth.getFullYear();
               const md = now.getMonth() - birth.getMonth();
               if (md < 0 || (md === 0 && now.getDate() < birth.getDate())) age--;
               if (isNaN(age) || age < 18) {
                 throw new Error("Cadastro disponível apenas para maiores de 18 anos.");
               }
             }

             // BONUS-02: Minimum password length
             if (password.length < 8) {
               toast({ variant: 'destructive', title: 'Senha muito curta', description: 'A senha deve ter no mínimo 8 caracteres.' });
               setIsLoading(false);
               hideLoader();
               return;
             }

             // HOTFIX-05: LGPD consent check
             if (!acceptedTerms) {
               throw new Error("Você precisa aceitar os Termos de Serviço e a Política de Privacidade para se cadastrar.");
             }
        }

        const metadata = {
          role: targetRole,
          full_name: fullName.trim(),
          cpf: cpf,
          whatsapp: whatsapp,
          data_nasc: birthDate,
          sexo: sexo
        };

        const { error } = await signUp(email, password, metadata);
        
        if (error) {
             if (error.message === 'resend_successful') {
                 // Already handled in context
                 hideLoader();
             } else {
                 throw error;
             }
        } else {
            toast({
              title: "Conta criada com sucesso!",
              description: "Verifique seu email para ativar a conta.",
              variant: "success"
            });
            trackSignup(isDoctor ? 'medico' : 'paciente');
            navigate('/cadastro-sucesso', { state: { email } });
            setTimeout(() => {
              hideLoader();
            }, 1000);
        }
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: isLogin ? "Erro no login" : "Erro no cadastro",
        description: error.message === "Invalid login credentials" ? "Email ou senha incorretos." : error.message || "Ocorreu um erro ao processar sua solicitação."
      });
      hideLoader();
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "O login com Google estará disponível em breve.",
    });
  };

  return (
    <>
      <Helmet>
        <title>{isDoctor ? 'Acesso Médico' : (isLogin ? 'Login' : 'Cadastro')} - Click Teleconsulta</title>
      </Helmet>
      
      <div className="min-h-screen w-full flex flex-col items-center justify-center py-8 px-4 bg-gradient-to-b from-blue-50 to-white">
        
        <div className="text-center mb-8 space-y-2">
            <h1 className="text-3xl font-bold text-blue-950 tracking-tight">
              {isDoctor ? 'Área do Médico' : 'Acesse sua conta'}
            </h1>
            <p className="text-gray-500 font-medium text-sm">
               {isDoctor ? 'Acesso restrito para médicos' : 'Entre para agendar e acompanhar suas consultas'}
            </p>
        </div>

        <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            
            <div className="space-y-6">

                <form onSubmit={handleAuth} className="space-y-4">
                    
                    {!isLogin && !isDoctor && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="relative">
                           <Input 
                                id="fullName" 
                                value={fullName} 
                                onChange={e => setFullName(e.target.value)} 
                                placeholder="Nome completo"
                                className="h-11 pl-4 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                           />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <MaskedInput
                                id="cpf"
                                name="cpf"
                                mask="000.000.000-00"
                                value={cpf}
                                onChange={e => setCpf(e.target.value)}
                                placeholder="CPF"
                                required
                            />
                            <Input
                                id="birthDate"
                                type="date"
                                value={birthDate}
                                onChange={e => setBirthDate(e.target.value)}
                                required
                                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                                className="h-11 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-100 text-gray-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <MaskedInput
                                id="whatsapp"
                                name="whatsapp"
                                mask="(00) 00000-0000"
                                value={whatsapp}
                                onChange={e => setWhatsapp(e.target.value)}
                                placeholder="WhatsApp"
                                required
                            />
                            <select
                                id="sexo"
                                value={sexo}
                                onChange={e => setSexo(e.target.value)}
                                required
                                className={`h-11 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none ${sexo ? 'text-gray-800' : 'text-gray-400'}`}
                            >
                                <option value="" disabled>Sexo</option>
                                <option value="masculino">Masculino</option>
                                <option value="feminino">Feminino</option>
                            </select>
                        </div>
                    </div>
                    )}

                    <div className="space-y-4">
                        <div className="relative group">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                          <Input 
                            id="email" 
                            type="email" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            placeholder="E-mail"
                            required
                            className="h-11 pl-11 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-gray-400 text-gray-900 transition-all"
                          />
                        </div>

                        <div className="relative group">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                          <Input 
                            id="password" 
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={e => setPassword(e.target.value)} 
                            placeholder="Senha"
                            required
                            className="h-11 pl-11 pr-11 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-gray-400 text-gray-900 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                    </div>

                    {/* HOTFIX-05: LGPD consent checkbox — only on signup */}
                    {!isLogin && !isDoctor && (
                      <div className="flex items-start gap-2 mt-3 animate-in fade-in duration-200">
                        <Checkbox
                          id="lgpd-consent"
                          checked={acceptedTerms}
                          onCheckedChange={setAcceptedTerms}
                          className="mt-0.5"
                        />
                        <label htmlFor="lgpd-consent" className="text-xs text-gray-600 leading-tight">
                          Li e aceito os{' '}
                          <a href="/legal?doc=terms_of_service" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                            Termos de Serviço
                          </a>{' '}
                          e a{' '}
                          <a href="/legal?doc=privacy_policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                            Política de Privacidade
                          </a>{' '}
                          conforme a LGPD (Lei 13.709/2018).
                        </label>
                      </div>
                    )}

                    <Button 
                        type="submit" 
                        className="w-full h-11 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg shadow-md hover:shadow-lg hover:scale-[1.01] transition-all duration-200 mt-2"
                        disabled={isLoading || (!isLogin && !isDoctor && !acceptedTerms)}
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : (isLogin ? 'Entrar' : 'Cadastrar')} 
                    </Button>
                </form>

                <div className="pt-2 text-center space-y-4">
                    {isLogin && (
                        <div>
                            <Link to="/recuperar-senha" className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"> 
                                Esqueceu sua senha?
                            </Link>
                        </div>
                    )}
                    
                    {!isDoctor && (
                        <p className="text-sm text-gray-600">
                        {isLogin ? "Ainda não tem conta?" : "Já possui uma conta?"}{" "}
                        <button type="button" onClick={() => setIsLogin(!isLogin)} className="font-semibold text-blue-600 hover:text-blue-800 hover:underline ml-1">
                            {isLogin ? "Cadastre-se" : "Entrar"}
                        </button>
                        </p>
                    )}

                    <div className="pt-4 flex justify-center">
                        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 h-8 text-xs gap-1 px-2 font-normal"> 
                            <ArrowLeft className="w-3 h-3" /> Voltar para o início
                        </Button>
                    </div>
                </div>
            </div>
        </div>
      </div>

    </>
  );
};

export default AuthPage;