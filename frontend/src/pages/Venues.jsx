import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SearchX, WifiOff } from 'lucide-react';
import api from '../services/api';
import VenueCard from '../components/VenueCard';
import Spinner from '../components/Spinner';
import { SPORTS } from '../constants';

export default function Venues() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [query, setQuery] = useState(search);
  const [sportType, setSportType] = useState(() => searchParams.get('sportType') || '');

  // Espera a que se deje de escribir: antes cada tecla disparaba una request y las
  // respuestas podían llegar desordenadas ("pad" mostrando los resultados de "pa").
  useEffect(() => {
    const id = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    const params = {};
    if (query) params.search = query;
    if (sportType) params.sportType = sportType;
    api.get('/venues', { params, signal: controller.signal })
      .then(({ data }) => setVenues(data))
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    setSearchParams(params, { replace: true });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, sportType, retry]);

  function clearFilters() {
    setSearch('');
    setQuery('');
    setSportType('');
  }

  const firstLoad = loading && venues.length === 0 && !error;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">Explorar canchas</h1>
      <p className="text-slate-500 mb-6">Filtra por deporte o busca por nombre y ubicación.</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="flex items-center gap-2 flex-1 card px-3.5 py-2.5 focus-within:ring-4 focus-within:ring-brand-500/10 focus-within:border-brand-500">
          <Search className="size-4 text-slate-500 shrink-0" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Busca por nombre o ubicación..."
            aria-label="Buscar canchas por nombre o ubicación"
            className="w-full outline-none text-base sm:text-sm text-slate-800 placeholder:text-slate-500"
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

      {firstLoad ? (
        <Spinner />
      ) : error ? (
        <div className="card p-10 text-center">
          <WifiOff className="size-8 text-slate-500 mx-auto mb-3" aria-hidden="true" />
          <p className="font-semibold text-slate-800">No pudimos cargar las canchas</p>
          <p className="text-sm text-slate-500 mt-1">Revisa tu conexión e inténtalo de nuevo.</p>
          <button type="button" onClick={() => setRetry((n) => n + 1)} className="btn-secondary mt-5">Reintentar</button>
        </div>
      ) : venues.length === 0 ? (
        <div className="card p-10 text-center">
          <SearchX className="size-8 text-slate-500 mx-auto mb-3" aria-hidden="true" />
          <p className="font-semibold text-slate-800">No se encontraron canchas con esos filtros</p>
          {(query || sportType) && (
            <button type="button" onClick={clearFilters} className="btn-secondary mt-5">Limpiar filtros</button>
          )}
        </div>
      ) : (
        // Mientras llega la búsqueda nueva, la lista anterior se queda atenuada en vez de
        // desaparecer detrás de un spinner en cada tecla.
        <div
          aria-busy={loading}
          className={`grid sm:grid-cols-2 lg:grid-cols-3 gap-5 transition-opacity duration-150 ${loading ? 'opacity-60' : ''}`}
        >
          {venues.map((v) => <VenueCard key={v.id} venue={v} />)}
        </div>
      )}
    </div>
  );
}
