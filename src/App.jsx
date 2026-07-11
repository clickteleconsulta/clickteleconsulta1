import React from 'react';
import { Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HomePage from '@/pages/HomePage';
import AppointmentsPage from '@/pages/AppointmentsPage';
import CheckoutPage from '@/pages/CheckoutPage';
import ConfirmationPage from '@/pages/ConfirmationPage';
import SupportPage from '@/pages/SupportPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import DoctorRouteGuard from '@/components/DoctorRouteGuard';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';
import AuthPage from '@/pages/AuthPage';
import DoctorArea from '@/pages/DoctorArea';
import PatientArea from '@/pages/PatientArea';
import PasswordRecoveryPage from '@/pages/PasswordRecoveryPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import { TooltipProvider } from '@/components/ui/tooltip';
import GuideViewerPage from '@/pages/GuideViewerPage';
import AppointmentSuccessPage from '@/pages/AppointmentSuccessPage';
import ConfirmationRequestPage from '@/pages/ConfirmationRequestPage';
import ChangePasswordPage from '@/pages/ChangePasswordPage';
import SignUpSuccessPage from '@/pages/SignUpSuccessPage';
import DoctorInviteSignupPage from '@/pages/DoctorInviteSignupPage';
import AuthConfirmPage from '@/pages/AuthConfirmPage';
import DoctorPublicProfilePage from '@/pages/DoctorPublicProfilePage';
import AppointmentReviewPage from '@/pages/AppointmentReviewPage';
import AppointmentConfirmationPage from '@/pages/AppointmentConfirmationPage';
import PatientRecordPage from '@/pages/prontuario/PatientRecordPage';
import PatientPrescriptionsPage from '@/pages/prontuario/PatientPrescriptionsPage';
import VerificationPage from '@/pages/VerificationPage';
import VideoCallPage from '@/pages/VideoCallPage';
import MemedPrescricaoPage from '@/pages/MemedPrescricaoPage';
import LegalPage from '@/pages/LegalPage';
import MessagesPage from '@/pages/MessagesPage';
import DoctorReviewsPage from '@/pages/doctor/DoctorReviewsPage';
import PatientReviewsPage from '@/pages/patient/PatientReviewsPage';
import DoctorsListPage from '@/pages/DoctorsListPage';
import { FEATURES } from '@/config/features';

// Admin Imports
import AdminLoginPage from '@/pages/admin/AdminLoginPage';
import AdminLayout from '@/layouts/AdminLayout';
import AppointmentsControlPage from '@/pages/admin/AppointmentsControlPage';
import ProfessionalsPage from '@/pages/admin/ProfessionalsPage';
import AdminLegalPage from '@/pages/admin/AdminLegalPage';
import AdminAiTrainingPage from '@/pages/admin/AdminAiTrainingPage';
import AdminPaymentMethodsPage from '@/pages/admin/AdminPaymentMethodsPage';
import AdminWithdrawalsPage from '@/pages/admin/AdminWithdrawalsPage';
import AdminReviewsPage from '@/pages/admin/AdminReviewsPage';
import AdminSecurityPage from '@/pages/admin/AdminSecurityPage';
import AdminProfessionalDocsPage from '@/pages/admin/AdminProfessionalDocsPage';

// Memed Integration
import MemedPrescriptionPage from '@/integrations/memed/MemedPrescriptionPage';

// New Sprint Pages (21/03)
import DoctorSchedulePage from '@/pages/doctor/DoctorSchedulePage';
import ConsultaEncerradaPage from '@/pages/ConsultaEncerradaPage';

// Components
import AiChatWidget from '@/components/AiChatWidget';
import GuestAppointmentPage from '@/pages/GuestAppointmentPage';
import Preloader from '@/components/Preloader';
import ErrorBoundary from '@/components/ErrorBoundary';

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
    if (profile.role === 'admin') return <Navigate to="/admin/dashboard/agendamentos" replace />;
    
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
             <Route path="agendamentos" element={<AppointmentsControlPage />} />
             <Route path="profissionais" element={<ProfessionalsPage />} />
             <Route path="documentacao" element={<AdminProfessionalDocsPage />} />
             <Route path="avaliacoes" element={<AdminReviewsPage />} />
             <Route path="metodos-recebimento" element={<AdminPaymentMethodsPage />} />
             <Route path="saques-pagamentos" element={<AdminWithdrawalsPage />} /> 
             <Route path="ai-training" element={<AdminAiTrainingPage />} />
             <Route path="legal" element={<AdminLegalPage />} />
             <Route path="seguranca" element={<AdminSecurityPage />} />
             <Route index element={<Navigate to="agendamentos" replace />} />
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
            <Route path="/acesso-paciente" element={<AuthRedirect role="paciente" />} />
            <Route path="/acesso-medico" element={<AuthRedirect role="medico" />} />
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
        </ErrorBoundary>
      </TooltipProvider>
    </>
  );
}

export default App;