import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;
  // recuerda a dónde iba, para volver ahí después del login
  if (!user) return <Navigate to={`/iniciar-sesion?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;

  return children;
}
