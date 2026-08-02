import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FullPageLoader } from "@/components/layout/FullPageLoader";
import { LandingPage } from "@/pages/LandingPage";

const LoginPage = lazy(() => import("@/pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("@/pages/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const PlaceholderPage = lazy(() => import("@/pages/PlaceholderPage").then((m) => ({ default: m.PlaceholderPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          {/* Public website */}
          <Route path="/" element={<LandingPage />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* User panel (protected) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<DashboardPage />} />
            <Route path="/app/wallet" element={<PlaceholderPage title="Wallet" description="Main, bonus & trading wallets." />} />
            <Route path="/app/packages" element={<PlaceholderPage title="Packages" description="Activation, history & status." />} />
            <Route path="/app/team" element={<PlaceholderPage title="Team" description="Referral tree & statistics." />} />
            <Route path="/app/settings" element={<PlaceholderPage title="Settings" description="Profile, security & preferences." />} />
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