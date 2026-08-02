import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FullPageLoader } from "@/components/layout/FullPageLoader";
import { PublicLayout } from "@/components/layout/public/PublicLayout";

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
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const PackagesPage = lazy(() => import("@/pages/PackagesPage").then((m) => ({ default: m.PackagesPage })));
const WalletPage = lazy(() => import("@/pages/WalletPage").then((m) => ({ default: m.WalletPage })));
const WithdrawalsPage = lazy(() => import("@/pages/WithdrawalsPage").then((m) => ({ default: m.WithdrawalsPage })));
const PlaceholderPage = lazy(() => import("@/pages/PlaceholderPage").then((m) => ({ default: m.PlaceholderPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          {/* Public website (shared layout: header / footer / announcement / maintenance) */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
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
            <Route path="/app/wallet" element={<WalletPage />} />
            <Route path="/app/withdrawals" element={<WithdrawalsPage />} />
            <Route path="/app/packages" element={<PackagesPage />} />
            <Route path="/app/team" element={<PlaceholderPage title="Team" description="Referral tree & statistics." />} />
            <Route path="/app/settings" element={<SettingsPage />} />
          </Route>

          {/* Admin panel (protected, admin only) */}
          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="/app/admin" element={<PlaceholderPage title="Admin Panel" description="Platform administration." />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}