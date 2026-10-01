import { Link, NavLink, useNavigate } from 'react-router-dom';
import { CalendarCheck2, LayoutDashboard, LogOut, MapPinned, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationsBell from './NotificationsBell';

const linkClass = ({ isActive }) =>
  `px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-brand-700 ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
  }`;

const tabClass = ({ isActive }) =>
  `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
    isActive ? 'text-brand-700' : 'text-slate-500'
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-extrabold text-lg text-slate-900">
            <span className="flex items-center justify-center size-8 rounded-lg bg-brand-700 text-white">
              <MapPinned className="size-4.5" />
            </span>
            {/* un solo nodo: con "Reserva" y <span>Ya</span> como hermanos, el gap-2 los separaba */}
            <span>Reserva<span className="text-brand-700">Ya</span></span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1" aria-label="Principal">
            <NavLink to="/canchas" className={linkClass}>Explorar canchas</NavLink>
            {user && (
              <NavLink to="/mis-reservas" className={linkClass}>
                <CalendarCheck2 className="size-4" /> Mis reservas
              </NavLink>
            )}
            {user?.role === 'owner' && (
              <NavLink to="/panel" className={linkClass}>
                <LayoutDashboard className="size-4" /> Mi panel
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <NotificationsBell />
                <span className="hidden md:inline text-sm text-slate-500 pl-2">{user.name}</span>
                <button onClick={handleLogout} className="btn-secondary !px-3" aria-label="Cerrar sesión" title="Cerrar sesión">
                  <LogOut className="size-4" />
                </button>
              </>
            ) : (
              <>
                <Link to="/iniciar-sesion" className="btn-secondary">
                  <span className="sm:hidden">Entrar</span>
                  <span className="hidden sm:inline">Iniciar sesión</span>
                </Link>
                <Link to="/registro" className="btn-primary hidden sm:inline-flex">Crear cuenta</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* En el celular la barra de arriba no tiene espacio para los links: sin esto no había
          forma de llegar a "Mis reservas" ni al panel salvo escribiendo la URL. */}
      <nav
        aria-label="Principal"
        className="sm:hidden fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      >
        <NavLink to="/canchas" className={tabClass}>
          <Search className="size-5" /> Explorar
        </NavLink>
        {user && (
          <NavLink to="/mis-reservas" className={tabClass}>
            <CalendarCheck2 className="size-5" /> Mis reservas
          </NavLink>
        )}
        {user?.role === 'owner' && (
          <NavLink to="/panel" className={tabClass}>
            <LayoutDashboard className="size-5" /> Mi panel
          </NavLink>
        )}
      </nav>
    </>
  );
}
