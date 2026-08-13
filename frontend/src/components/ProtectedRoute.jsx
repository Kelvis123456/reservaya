import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/iniciar-sesion" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;

  return children;
}
