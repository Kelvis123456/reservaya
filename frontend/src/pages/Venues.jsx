import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import api from '../services/api';
import VenueCard from '../components/VenueCard';
import Spinner from '../components/Spinner';

const SPORTS = ['Fútbol', 'Baloncesto', 'Tenis', 'Vóleibol', 'Pádel'];

export default function Venues() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [sportType, setSportType] = useState(() => searchParams.get('sportType') || '');

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (sportType) params.sportType = sportType;
    api.get('/venues', { params }).then(({ data }) => setVenues(data)).finally(() => setLoading(false));

    const next = {};
    if (search) next.search = search;
    if (sportType) next.sportType = sportType;
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sportType]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Explorar canchas</h1>
      <p className="text-slate-500 mb-6">Filtra por deporte o busca por nombre y ubicación.</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="flex items-center gap-2 flex-1 card px-3.5 py-2.5">
          <Search className="size-4 text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Busca por nombre o ubicación..."
            aria-label="Buscar canchas por nombre o ubicación"
            className="w-full outline-none text-sm text-slate-800"
          />
        </div>
        <select
          value={sportType}
          onChange={(e) => setSportType(e.target.value)}
          aria-label="Filtrar por deporte"
          className="input sm:w-52"
        >
          <option value="">Todos los deportes</option>
          {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : venues.length === 0 ? (
        <p className="text-center text-slate-400 py-16">No se encontraron canchas con esos filtros.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {venues.map((v) => <VenueCard key={v.id} venue={v} />)}
        </div>
      )}
    </div>
  );
}
