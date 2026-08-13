import { Link, useNavigate } from 'react-router-dom';
import { CalendarCheck2, LayoutDashboard, LogOut, MapPinned } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationsBell from './NotificationsBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/70">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-lg text-slate-900">
          <span className="flex items-center justify-center size-8 rounded-lg bg-brand-600 text-white">
            <MapPinned className="size-4.5" />
          </span>
          Reserva<span className="text-brand-600">Ya</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-1">
          <Link to="/canchas" className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">
            Explorar canchas
          </Link>
          {user && (
            <Link to="/mis-reservas" className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 flex items-center gap-1.5">
              <CalendarCheck2 className="size-4" /> Mis reservas
            </Link>
          )}
          {user?.role === 'owner' && (
            <Link to="/panel" className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 flex items-center gap-1.5">
              <LayoutDashboard className="size-4" /> Mi panel
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <NotificationsBell />
              <span className="hidden md:inline text-sm text-slate-500 pl-2">{user.name}</span>
              <button onClick={handleLogout} className="btn-secondary !px-3" title="Cerrar sesión">
                <LogOut className="size-4" />
              </button>
            </>
          ) : (
            <>
              <Link to="/iniciar-sesion" className="btn-secondary">Iniciar sesión</Link>
              <Link to="/registro" className="btn-primary">Crear cuenta</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
