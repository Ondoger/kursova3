import { Navigate, useLocation } from "react-router-dom";
import { useStore } from "../../store/useStore";

/*
 * Gate for authenticated routes. Behaviour:
 *   - while authReady === false → render nothing (App-level hydrator
 *     fires /api/auth/me on mount; this lasts ~50-200ms, no flash needed)
 *   - if no user                → redirect to /login, remember location
 *   - if `roles` prop is set    → user.role must match, else /dashboard
 */
export function ProtectedRoute({ children, roles }) {
  const authUser = useStore((s) => s.authUser);
  const authReady = useStore((s) => s.authReady);
  const location = useLocation();

  if (!authReady) return null;
  if (!authUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (roles && !roles.includes(authUser.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

/**
 * The opposite — redirects already-logged-in users away from /login,
 * /register, /verify-email so they don't re-auth.
 */
export function GuestOnlyRoute({ children, redirectTo = "/dashboard" }) {
  const authUser = useStore((s) => s.authUser);
  const authReady = useStore((s) => s.authReady);
  if (!authReady) return null;
  if (authUser) return <Navigate to={redirectTo} replace />;
  return children;
}
