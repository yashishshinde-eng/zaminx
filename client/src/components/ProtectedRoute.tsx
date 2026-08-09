import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { FullPageLoader } from "./layout/FullPageLoader";

interface ProtectedRouteProps {
  adminOnly?: boolean;
}

export function ProtectedRoute({ adminOnly }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (adminOnly && user?.role !== "admin") {
    return <Navigate to="/app" replace />;
  }

  // Admins have no business in the user panel (dashboard, wallet, team, …).
  // Send them to the admin dashboard instead. Impersonation is unaffected:
  // while impersonating, the active user is the target (role "user").
  if (!adminOnly && user?.role === "admin") {
    return <Navigate to="/app/admin" replace />;
  }

  return <Outlet />;
}