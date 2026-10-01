import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Clock, WifiOff } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import { formatDate, todayIn } from '../utils/dates';

export default function MyBookings() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const { push } = useToast();

  function load() {
    setLoading(true);
    setError(false);
    api.get('/reservations/me')
      .then(({ data }) => setReservations(data))
      // antes un fallo de red mostraba "Aún no tienes reservas"
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function cancel(id) {
    setCancellingId(id);
    try {
      const { data } = await api.patch(`/reservations/${id}/cancel`);
      // se actualiza la fila en vez de recargar toda la página detrás de un spinner
      setReservations((list) => list.map((r) => (r.id === id ? { ...r, status: data.status } : r)));
      push('Reserva cancelada');
    } catch (err) {
      push(err.response?.data?.message || 'No se pudo cancelar', 'error');
    } finally {
      setCancellingId(null);
      setConfirmingId(null);
    }
  }

  if (loading) return <Spinner />;

  const today = todayIn();

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-6">Mis reservas</h1>

      {error ? (
        <div className="card p-10 text-center">
          <WifiOff className="size-8 text-slate-500 mx-auto mb-3" aria-hidden="true" />
          <p className="font-semibold text-slate-800">No pudimos cargar tus reservas</p>
          <button type="button" onClick={load} className="btn-secondary mt-5">Reintentar</button>
        </div>
      ) : reservations.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-slate-500 mb-4">Aún no tienes reservas.</p>
          <Link to="/canchas" className="btn-primary">Explorar canchas</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reservations.map((r) => {
            const cancellable = r.status !== 'cancelled' && r.date >= today;
            return (
              // En columna en el celular: en una sola fila el botón le dejaba ~120px al texto
              // y los nombres quedaban en "C…".
              <div key={r.id} className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <img
                    src={r.venue?.imageUrl}
                    alt=""
                    className="size-16 rounded-xl object-cover shrink-0 bg-slate-100"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="font-semibold text-slate-900 sm:truncate">{r.venue?.name}</h3>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                      <MapPin className="size-3.5 shrink-0" aria-hidden="true" /> <span className="truncate">{r.venue?.address}</span>
                    </p>
                    <p className="text-sm text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                      <span className="flex items-center gap-1"><Calendar className="size-3.5 shrink-0" aria-hidden="true" /> <span className="first-letter:uppercase">{formatDate(r.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span></span>
                      <span className="flex items-center gap-1 tabular-nums"><Clock className="size-3.5 shrink-0" aria-hidden="true" /> {r.startTime} – {r.endTime}</span>
                    </p>
                  </div>
                </div>
                {cancellable && (
                  confirmingId === r.id ? (
                    <div className="flex gap-2 sm:shrink-0">
                      <button type="button" onClick={() => cancel(r.id)} disabled={cancellingId === r.id} className="btn-danger flex-1 sm:flex-none">
                        {cancellingId === r.id ? 'Cancelando…' : 'Sí, cancelar'}
                      </button>
                      <button type="button" onClick={() => setConfirmingId(null)} disabled={cancellingId === r.id} className="btn-secondary flex-1 sm:flex-none">
                        No
                      </button>
                    </div>
                  ) : (
                    // un toque ya no cancela: primero pide confirmación en la misma tarjeta
                    <button type="button" onClick={() => setConfirmingId(r.id)} className="btn-danger w-full sm:w-auto sm:shrink-0">
                      Cancelar
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
