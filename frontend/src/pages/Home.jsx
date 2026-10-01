import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarX2, Search, ShieldCheck, Sparkles, Star, WifiOff, Zap } from 'lucide-react';
import api from '../services/api';
import VenueCard from '../components/VenueCard';
import Spinner from '../components/Spinner';

export default function Home() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/venues')
      .then(({ data }) => setVenues(data.slice(0, 6)))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    navigate(`/canchas?search=${encodeURIComponent(search)}`);
  }

  return (
    <div>
      {/* brand-800 -> brand-700: el extremo emerald-500 dejaba el texto blanco en 2.47:1;
          ahora el peor punto es blanco sobre brand-700, 5.48:1 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-800 to-brand-700 text-white">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
        <div className="relative max-w-6xl mx-auto px-4 py-20 sm:py-28 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium mb-5">
            <Sparkles className="size-3.5" /> Reserva en segundos, juega hoy
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-balance">
            Encuentra y reserva la cancha perfecta
          </h1>
          <p className="mt-4 text-brand-50 text-lg max-w-xl mx-auto">
            Fútbol, baloncesto, tenis y más. Disponibilidad en tiempo real y reseñas de otros jugadores.
          </p>

          <form onSubmit={handleSearch} className="mt-8 max-w-xl mx-auto flex gap-2 bg-white rounded-2xl p-2 shadow-xl focus-within:ring-4 focus-within:ring-white/40">
            <div className="flex items-center gap-2 flex-1 px-2">
              <Search className="size-4.5 text-slate-500 shrink-0" aria-hidden="true" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Busca por nombre o ubicación..."
                aria-label="Buscar canchas por nombre o ubicación"
                className="w-full outline-none text-slate-800 text-base sm:text-sm placeholder:text-slate-500"
              />
            </div>
            <button type="submit" className="btn-primary">Buscar</button>
          </form>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid sm:grid-cols-3 gap-4 mb-14">
          {[
            { icon: Zap, title: 'Reserva instantánea', text: 'Ve la disponibilidad real de cada cancha y reserva en el momento.' },
            { icon: ShieldCheck, title: 'Sin dobles reservas', text: 'Cada horario se valida al instante para que nunca choque con otra reserva.' },
            { icon: Star, title: 'Reseñas reales', text: 'Opiniones y calificaciones de jugadores que ya reservaron.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="card p-5">
              <div className="size-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center mb-3">
                <Icon className="size-5" />
              </div>
              <h3 className="font-semibold text-slate-900">{title}</h3>
              <p className="text-sm text-slate-500 mt-1">{text}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold text-slate-900">Canchas destacadas</h2>
          <Link to="/canchas" className="text-sm font-medium text-brand-700 hover:text-brand-800">
            Ver todas →
          </Link>
        </div>

        {loading ? (
          <Spinner />
        ) : error ? (
          <div className="card p-10 text-center">
            <WifiOff className="size-8 text-slate-500 mx-auto mb-3" aria-hidden="true" />
            <p className="font-semibold text-slate-800">No pudimos cargar las canchas</p>
            <button type="button" onClick={() => window.location.reload()} className="btn-secondary mt-5">Reintentar</button>
          </div>
        ) : venues.length === 0 ? (
          <div className="card p-10 text-center">
            <CalendarX2 className="size-8 text-slate-500 mx-auto mb-3" aria-hidden="true" />
            <p className="font-semibold text-slate-800">Todavía no hay canchas publicadas</p>
            <p className="text-sm text-slate-500 mt-1">¿Tienes una cancha? Crea una cuenta de dueño y publícala.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {venues.map((v) => <VenueCard key={v.id} venue={v} />)}
          </div>
        )}
      </section>
    </div>
  );
}
