import React, { lazy, Suspense } from 'react';
import { Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
const HomePage = lazy(() => import('@/pages/HomePage'));
const AppointmentsPage = lazy(() => import('@/pages/AppointmentsPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const ConfirmationPage = lazy(() => import('@/pages/ConfirmationPage'));
const SupportPage = lazy(() => import('@/pages/SupportPage'));
import ProtectedRoute from '@/components/ProtectedRoute';
import DoctorRouteGuard from '@/components/DoctorRouteGuard';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';
const AuthPage = lazy(() => import('@/pages/AuthPage'));
const DoctorArea = lazy(() => import('@/pages/DoctorArea'));
const PatientArea = lazy(() => import('@/pages/PatientArea'));
const PasswordRecoveryPage = lazy(() => import('@/pages/PasswordRecoveryPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
import { TooltipProvider } from '@/components/ui/tooltip';
const GuideViewerPage = lazy(() => import('@/pages/GuideViewerPage'));
const AppointmentSuccessPage = lazy(() => import('@/pages/AppointmentSuccessPage'));
const ConfirmationRequestPage = lazy(() => import('@/pages/ConfirmationRequestPage'));
const ChangePasswordPage = lazy(() => import('@/pages/ChangePasswordPage'));
const SignUpSuccessPage = lazy(() => import('@/pages/SignUpSuccessPage'));
const DoctorInviteSignupPage = lazy(() => import('@/pages/DoctorInviteSignupPage'));
const AuthConfirmPage = lazy(() => import('@/pages/AuthConfirmPage'));
const DoctorPublicProfilePage = lazy(() => import('@/pages/DoctorPublicProfilePage'));
const AppointmentReviewPage = lazy(() => import('@/pages/AppointmentReviewPage'));
const AppointmentConfirmationPage = lazy(() => import('@/pages/AppointmentConfirmationPage'));
const PatientRecordPage = lazy(() => import('@/pages/prontuario/PatientRecordPage'));
const PatientPrescriptionsPage = lazy(() => import('@/pages/prontuario/PatientPrescriptionsPage'));
const VerificationPage = lazy(() => import('@/pages/VerificationPage'));
const VideoCallPage = lazy(() => import('@/pages/VideoCallPage'));
const MemedPrescricaoPage = lazy(() => import('@/pages/MemedPrescricaoPage'));
const LegalPage = lazy(() => import('@/pages/LegalPage'));
const MessagesPage = lazy(() => import('@/pages/MessagesPage'));
const DoctorReviewsPage = lazy(() => import('@/pages/doctor/DoctorReviewsPage'));
const PatientReviewsPage = lazy(() => import('@/pages/patient/PatientReviewsPage'));
const DoctorsListPage = lazy(() => import('@/pages/DoctorsListPage'));
import { FEATURES } from '@/config/features';

// Admin Imports
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'));
const AdminLayout = lazy(() => import('@/layouts/AdminLayout'));
const AppointmentsControlPage = lazy(() => import('@/pages/admin/AppointmentsControlPage'));
const ProfessionalsPage = lazy(() => import('@/pages/admin/ProfessionalsPage'));
const AdminLegalPage = lazy(() => import('@/pages/admin/AdminLegalPage'));
const AdminAiTrainingPage = lazy(() => import('@/pages/admin/AdminAiTrainingPage'));
const AdminPaymentMethodsPage = lazy(() => import('@/pages/admin/AdminPaymentMethodsPage'));
const AdminWithdrawalsPage = lazy(() => import('@/pages/admin/AdminWithdrawalsPage'));
const AdminReviewsPage = lazy(() => import('@/pages/admin/AdminReviewsPage'));
const AdminSecurityPage = lazy(() => import('@/pages/admin/AdminSecurityPage'));
const AdminProfessionalDocsPage = lazy(() => import('@/pages/admin/AdminProfessionalDocsPage'));
const AdminStrategyPage = lazy(() => import('@/pages/admin/AdminStrategyPage'));
const AdminRefundsPage = lazy(() => import('@/pages/admin/AdminRefundsPage'));
const AdminBroadcastPage = lazy(() => import('@/pages/admin/AdminBroadcastPage'));
const AdminAuditPage = lazy(() => import('@/pages/admin/AdminAuditPage'));
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage'));
const AdminPatientsPage = lazy(() => import('@/pages/admin/AdminPatientsPage'));

// Memed Integration
const MemedPrescriptionPage = lazy(() => import('@/integrations/memed/MemedPrescriptionPage'));

// New Sprint Pages (21/03)
const DoctorSchedulePage = lazy(() => import('@/pages/doctor/DoctorSchedulePage'));
const ConsultaEncerradaPage = lazy(() => import('@/pages/ConsultaEncerradaPage'));

// Components
import AiChatWidget from '@/components/AiChatWidget';
const GuestAppointmentPage = lazy(() => import('@/pages/GuestAppointmentPage'));
import Preloader from '@/components/Preloader';
import ErrorBoundary from '@/components/ErrorBoundary';
import ConsentBanner from '@/components/ConsentBanner';

// Public Layout Component
const AppLayout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background font-sans relative">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Outlet />
      </main>
      <Footer />
      <AiChatWidget />
    </div>
  );
};

const AuthRedirect = ({ role }) => {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading || (session && !profile)) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground text-sm animate-pulse">
           {session && !profile ? 'Finalizando configuração da conta...' : 'Carregando...'}
        </p>
      </div>
    );
  }

  if (session && profile) {
    if (profile.role === 'admin') return <Navigate to="/admin/dashboard/estrategia" replace />;
    
    const from = location.state?.from?.pathname || (profile.role === 'medico' ? '/medico/dashboard' : '/paciente/dashboard');
    return <Navigate to={from} replace />;
  }
  
  return <AuthPage targetRole={role} />;
};

function App() {
  const { loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Click Teleconsulta</title>
        <meta name="description" content="Sua saúde a um clique de distância. Agende teleconsultas com especialistas de forma rápida e segura." />
        <meta property="og:title" content="Click Teleconsulta" />
        <meta property="og:description" content="Sua saúde a um clique de distância." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:opsz,wght@6..12,400;6..12,700;6..12,900&display=swap" rel="stylesheet" />
      </Helmet>
      
      <TooltipProvider>
        <Preloader />
        
        <ErrorBoundary>
        <Suspense fallback={
          <div className="w-full h-[60vh] flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        }>
        <Routes>
          {/* Dashboard Route Aliases */}
          <Route path="/area-medico/avaliacoes" element={<Navigate to="/medico/dashboard/avaliacoes" replace />} />
          <Route path="/area-paciente/avaliacoes" element={<Navigate to="/paciente/dashboard/avaliacoes" replace />} />
          <Route path="/doctor/reviews" element={<Navigate to="/medico/dashboard/avaliacoes" replace />} />
          <Route path="/patient/reviews" element={<Navigate to="/paciente/dashboard/avaliacoes" replace />} />

          {/* 1. Doctor Dashboard Routes */}
          {/* All dashboard routes including procedimentos are properly nested inside DoctorArea */}
          <Route path="/medico/dashboard/*" element={
            <ProtectedRoute allowedRoles={['medico']}>
              <DoctorArea />
            </ProtectedRoute>
          } />

          {/* 2. Admin Routes (Isolated Layout) */}
          <Route path="/acesso-administrador" element={<AdminLoginPage />} />
          
          <Route path="/admin/avaliacoes" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
             <Route index element={<AdminReviewsPage />} />
          </Route>

          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
             <Route path="estrategia" element={<AdminStrategyPage />} />
             <Route path="agendamentos" element={<AppointmentsControlPage />} />
             <Route path="profissionais" element={<ProfessionalsPage />} />
             <Route path="documentacao" element={<AdminProfessionalDocsPage />} />
             <Route path="pacientes" element={<AdminPatientsPage />} />
             <Route path="avaliacoes" element={<AdminReviewsPage />} />
             <Route path="metodos-recebimento" element={<AdminPaymentMethodsPage />} />
             <Route path="saques-pagamentos" element={<AdminWithdrawalsPage />} />
             <Route path="reembolsos" element={<AdminRefundsPage />} />
             <Route path="comunicados" element={<AdminBroadcastPage />} />
             <Route path="auditoria" element={<AdminAuditPage />} />
             <Route path="ai-training" element={<AdminAiTrainingPage />} />
             <Route path="legal" element={<AdminLegalPage />} />
             <Route path="configuracoes" element={<AdminSettingsPage />} />
             <Route path="seguranca" element={<AdminSecurityPage />} />
             <Route index element={<Navigate to="estrategia" replace />} />
          </Route>

          {/* 3. Specialized Routes */}
          {FEATURES.PRONTUARIO && <Route path="/verificar/:code" element={<VerificationPage />} />}
          {FEATURES.GUEST_ACCESS && <Route path="/paciente/guest" element={<GuestAppointmentPage />} />}
          <Route path="/legal" element={<LegalPage />} />

          {FEATURES.VIDEO_CALL && <Route path="/call/:appointmentId" element={
            <ProtectedRoute allowedRoles={['medico', 'paciente']}>
              <VideoCallPage />
            </ProtectedRoute>
          } />}

          {/* Consulta Routes */}
          {FEATURES.VIDEO_CALL && <Route path="/consulta/:appointmentId" element={
            <ProtectedRoute allowedRoles={['medico', 'paciente']}>
              <VideoCallPage />
            </ProtectedRoute>
          } />}

          {FEATURES.VIDEO_CALL && <Route path="/consulta/:id/encerrada" element={
            <ProtectedRoute allowedRoles={['medico', 'paciente']}>
              <ConsultaEncerradaPage />
            </ProtectedRoute>
          } />}

          {/* Doctor Schedule */}
          <Route path="/medico/agenda" element={
            <ProtectedRoute allowedRoles={['medico']}>
              <DoctorSchedulePage />
            </ProtectedRoute>
          } />

          {/* Direct Messages Route */}
          {FEATURES.MESSAGING && <Route path="/mensagens" element={
            <ProtectedRoute allowedRoles={['medico', 'paciente']}>
              <div className="container mx-auto px-4 py-8 h-screen pt-24">
                 <MessagesPage />
              </div>
            </ProtectedRoute>
          } />}

          {/* Doctor Specific Feature Routes */}
          {FEATURES.PRONTUARIO && <Route path="/dashboard/medico/pacientes/:patientId" element={
            <ProtectedRoute allowedRoles={['medico']}>
              <PatientRecordPage />
            </ProtectedRoute>
          } />}

          {FEATURES.PRONTUARIO && <Route path="/dashboard/medico/pacientes/:patientId/prescricoes" element={
            <ProtectedRoute allowedRoles={['medico']}>
              <PatientPrescriptionsPage />
            </ProtectedRoute>
          } />}

          {FEATURES.PRONTUARIO && <Route path="/dashboard/prescricoes/memed" element={
            <ProtectedRoute allowedRoles={['medico']}>
              <MemedPrescriptionPage />
            </ProtectedRoute>
          } />}

          {/* HOTFIX-06: Protected with ProtectedRoute instead of DoctorRouteGuard (which only redirects, doesn't block) */}
          {FEATURES.PRONTUARIO && <Route path="/prescricao/memed" element={
            <ProtectedRoute allowedRoles={['medico']}>
               <MemedPrescricaoPage />
            </ProtectedRoute>
          } />}

          {/* 4. Public & Patient Routes */}
          <Route element={
            <DoctorRouteGuard>
              <AppLayout />
            </DoctorRouteGuard>
          }>
            <Route path="/" element={<HomePage />} />
            <Route path="/agendamentos" element={<AppointmentsPage />} />
            <Route path="/medicos" element={<DoctorsListPage />} />
            <Route path="/suporte" element={<SupportPage />} />
            
            {/* Auth Routes */}
            <Route path="/acesso-cliente" element={<AuthRedirect role="paciente" />} />
            <Route path="/acesso-profissional" element={<AuthRedirect role="medico" />} />
            {/* Compatibilidade: rotas antigas redirecionam para as novas */}
            <Route path="/acesso-paciente" element={<Navigate to="/acesso-cliente" replace />} />
            <Route path="/acesso-medico" element={<Navigate to="/acesso-profissional" replace />} />
            <Route path="/auth/confirmar" element={<AuthConfirmPage />} />
            <Route path="/cadastro-medico" element={<DoctorInviteSignupPage />} />
            <Route path="/cadastro-medico/:token" element={<DoctorInviteSignupPage />} />
            
            <Route path="/recuperar-senha" element={<PasswordRecoveryPage />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
            <Route path="/confirmacao-cadastro" element={<ConfirmationRequestPage />} />
            <Route path="/cadastro-sucesso" element={<SignUpSuccessPage />} />

            <Route path="/conta/alterar-senha" element={
              <ProtectedRoute allowedRoles={['paciente', 'admin']}>
                <ChangePasswordPage />
              </ProtectedRoute>
            } />
            
            <Route path="/paciente/dashboard/*" element={
              <ProtectedRoute allowedRoles={['paciente']}>
                <PatientArea />
              </ProtectedRoute>
            } />

            {/* Checkout & Appointment Flow */}
            <Route path="/checkout" element={
              <ProtectedRoute allowedRoles={['paciente']}>
                <CheckoutPage />
              </ProtectedRoute>
            } />

            <Route path="/agendamento/revisao" element={
              <ProtectedRoute allowedRoles={['paciente']}>
                <AppointmentReviewPage />
              </ProtectedRoute>
            } />

            <Route path="/agendamento/confirmado" element={
              <ProtectedRoute allowedRoles={['paciente']}>
                <AppointmentConfirmationPage />
              </ProtectedRoute>
            } />
            
            <Route path="/confirmacao" element={
              <ProtectedRoute allowedRoles={['paciente']}>
                <ConfirmationPage />
              </ProtectedRoute>
            } />

            <Route path="/agendamento-sucesso" element={
              <ProtectedRoute allowedRoles={['paciente']}>
                <AppointmentSuccessPage />
              </ProtectedRoute>
            } />

            {FEATURES.PRONTUARIO && <Route path="/guia/:guideId" element={
              <ProtectedRoute allowedRoles={['paciente']}>
                <GuideViewerPage />
              </ProtectedRoute>
            } />}

            {/* Dynamic Routes */}
            <Route path="/medico/:id" element={<DoctorPublicProfilePage />} />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        </Routes>
        </Suspense>
        </ErrorBoundary>
        <ConsentBanner />
      </TooltipProvider>
    </>
  );
}

export default App;