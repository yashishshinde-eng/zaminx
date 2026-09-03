import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FullPageLoader } from "@/components/layout/FullPageLoader";
import { PublicLayout } from "@/components/layout/public/PublicLayout";
import { useAuth } from "@/context/AuthContext";

// Public website
const HomePage = lazy(() => import("@/pages/public/HomePage").then((m) => ({ default: m.HomePage })));
const AboutPage = lazy(() => import("@/pages/public/AboutPage").then((m) => ({ default: m.AboutPage })));
const CompensationPlanPage = lazy(() => import("@/pages/public/CompensationPlanPage").then((m) => ({ default: m.CompensationPlanPage })));
const FaqPage = lazy(() => import("@/pages/public/FaqPage").then((m) => ({ default: m.FaqPage })));
const ContactPage = lazy(() => import("@/pages/public/ContactPage").then((m) => ({ default: m.ContactPage })));
const TermsPage = lazy(() => import("@/pages/public/TermsPage").then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import("@/pages/public/PrivacyPage").then((m) => ({ default: m.PrivacyPage })));

// Auth
const LoginPage = lazy(() => import("@/pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("@/pages/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import("@/pages/VerifyEmailPage").then((m) => ({ default: m.VerifyEmailPage })));

// App (protected)
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const DepositPage = lazy(() => import("@/pages/DepositPage").then((m) => ({ default: m.DepositPage })));
const ActivateMemberPage = lazy(() => import("@/pages/ActivateMemberPage").then((m) => ({ default: m.ActivateMemberPage })));
const TradePage = lazy(() => import("@/pages/TradePage").then((m) => ({ default: m.TradePage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const PackagesPage = lazy(() => import("@/pages/PackagesPage").then((m) => ({ default: m.PackagesPage })));
const WalletPage = lazy(() => import("@/pages/WalletPage").then((m) => ({ default: m.WalletPage })));
const P2PPage = lazy(() => import("@/pages/P2PPage").then((m) => ({ default: m.P2PPage })));
const WithdrawalsPage = lazy(() => import("@/pages/WithdrawalsPage").then((m) => ({ default: m.WithdrawalsPage })));
const TeamPage = lazy(() => import("@/pages/TeamPage").then((m) => ({ default: m.TeamPage })));
const BonanzaPage = lazy(() => import("@/pages/BonanzaPage").then((m) => ({ default: m.BonanzaPage })));
const ReportsPage = lazy(() => import("@/pages/ReportsPage").then((m) => ({ default: m.ReportsPage })));
const SupportPage = lazy(() => import("@/pages/SupportPage").then((m) => ({ default: m.SupportPage })));
const AdminReportsPage = lazy(() => import("@/pages/AdminReportsPage").then((m) => ({ default: m.AdminReportsPage })));
const AdminDashboardPage = lazy(() => import("@/pages/AdminDashboardPage").then((m) => ({ default: m.AdminDashboardPage })));
const AdminUsersPage = lazy(() => import("@/pages/AdminUsersPage").then((m) => ({ default: m.AdminUsersPage })));
const AdminUserDetailPage = lazy(() => import("@/pages/AdminUserDetailPage").then((m) => ({ default: m.AdminUserDetailPage })));
const AdminCompensationSettingsPage = lazy(() => import("@/pages/AdminCompensationSettingsPage").then((m) => ({ default: m.AdminCompensationSettingsPage })));
const AdminBonanzasPage = lazy(() => import("@/pages/AdminBonanzasPage").then((m) => ({ default: m.AdminBonanzasPage })));
const AdminCmsPagesPage = lazy(() => import("@/pages/AdminCmsPagesPage").then((m) => ({ default: m.AdminCmsPagesPage })));
const AdminSiteConfigPage = lazy(() => import("@/pages/AdminSiteConfigPage").then((m) => ({ default: m.AdminSiteConfigPage })));
const AdminSmtpSettingsPage = lazy(() => import("@/pages/AdminSmtpSettingsPage").then((m) => ({ default: m.AdminSmtpSettingsPage })));
const AdminNowpaymentsSettingsPage = lazy(() => import("@/pages/AdminNowpaymentsSettingsPage").then((m) => ({ default: m.AdminNowpaymentsSettingsPage })));
const AdminSecurityPage = lazy(() => import("@/pages/AdminSecurityPage").then((m) => ({ default: m.AdminSecurityPage })));
const AdminLogsPage = lazy(() => import("@/pages/AdminLogsPage").then((m) => ({ default: m.AdminLogsPage })));
const AdminSupportPage = lazy(() => import("@/pages/AdminSupportPage").then((m) => ({ default: m.AdminSupportPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

/**
 * Root entry. A referral link is `/?ref=<code>` — when an unauthenticated visitor
 * lands here, bounce them to `/register?ref=<code>` so the code is prefilled.
 * Authenticated members (already signed in) see the homepage as normal.
 */
function HomeRoute() {
  const [searchParams] = useSearchParams();
  const ref = searchParams.get("ref");
  const { isAuthenticated, isLoading } = useAuth();

  if (ref && isLoading) return <FullPageLoader />;
  if (ref && !isAuthenticated) {
    return <Navigate to={`/register?ref=${encodeURIComponent(ref)}`} replace />;
  }
  return <HomePage />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          {/* Public website (shared layout: header / footer / announcement / maintenance) */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/compensation-plan" element={<CompensationPlanPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
          </Route>

          {/* Auth (no shared layout) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* User panel (protected) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<DashboardPage />} />
            <Route path="/app/deposit" element={<DepositPage />} />
            <Route path="/app/activate-member" element={<ActivateMemberPage />} />
            <Route path="/app/trade" element={<TradePage />} />
            <Route path="/app/wallet" element={<WalletPage />} />
            <Route path="/app/p2p" element={<P2PPage />} />
            <Route path="/app/withdrawals" element={<WithdrawalsPage />} />
            <Route path="/app/packages" element={<PackagesPage />} />
            <Route path="/app/team" element={<TeamPage />} />
            <Route path="/app/bonanzas" element={<BonanzaPage />} />
            <Route path="/app/reports" element={<ReportsPage />} />
            <Route path="/app/settings" element={<SettingsPage />} />
            <Route path="/app/support" element={<SupportPage />} />
          </Route>

          {/* Admin panel (protected, admin only) */}
          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="/app/admin" element={<AdminDashboardPage />} />
            <Route path="/app/admin/users" element={<AdminUsersPage />} />
            <Route path="/app/admin/users/:id" element={<AdminUserDetailPage />} />
            <Route path="/app/admin/compensation" element={<AdminCompensationSettingsPage />} />
            <Route path="/app/admin/bonanzas" element={<AdminBonanzasPage />} />
            <Route path="/app/admin/cms" element={<AdminCmsPagesPage />} />
            <Route path="/app/admin/site-config" element={<AdminSiteConfigPage />} />
            <Route path="/app/admin/smtp" element={<AdminSmtpSettingsPage />} />
            <Route path="/app/admin/payments" element={<AdminNowpaymentsSettingsPage />} />
            <Route path="/app/admin/security" element={<AdminSecurityPage />} />
            <Route path="/app/admin/logs" element={<AdminLogsPage />} />
            <Route path="/app/admin/reports" element={<AdminReportsPage />} />
            <Route path="/app/admin/support" element={<AdminSupportPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}