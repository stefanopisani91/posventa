import { Navigate, useLocation } from "react-router";
import { ApiError } from "../../api.ts";
import { ErrorState } from "../../components/ui.tsx";

/** Error display for staff pages: an expired session goes back to the login page. */
export function StaffError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const location = useLocation();
  if (error instanceof ApiError && error.status === 401) {
    return <Navigate to="/staff/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <ErrorState error={error} onRetry={onRetry} />;
}
