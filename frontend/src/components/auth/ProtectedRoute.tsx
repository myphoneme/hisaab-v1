import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const token = useAuthStore((state) => state.token);

  // Check if user has a token in either the store or localStorage
  const hasToken = token || localStorage.getItem('access_token');

  if (!isAuthenticated && !hasToken) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
