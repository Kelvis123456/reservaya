import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Clock } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';

export default function MyBookings() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  function load() {
    setLoading(true);
    api.get('/reservations/me').then(({ data }) => setReservations(data)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function cancel(id) {
    try {
      await api.patch(`/reservations/${id}/cancel`);
      push('Reserva cancelada');
      load();
    } catch (err) {
      push(err.response?.data?.message || 'No se pudo cancelar', 'error');
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Mis reservas</h1>

      {reservations.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-slate-500 mb-4">Aún no tienes reservas.</p>
          <Link to="/canchas" className="btn-primary">Explorar canchas</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reservations.map((r) => (
            <div key={r.id} className="card p-5 flex items-center gap-4">
              <img
                src={r.venue?.imageUrl}
                alt={r.venue?.name}
                className="size-16 rounded-xl object-cover shrink-0 bg-slate-100"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900 truncate">{r.venue?.name}</h3>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="size-3.5 shrink-0" /> {r.venue?.address}
                </p>
                <p className="text-sm text-slate-500 flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1"><Calendar className="size-3.5" /> {r.date}</span>
                  <span className="flex items-center gap-1"><Clock className="size-3.5" /> {r.startTime} - {r.endTime}</span>
                </p>
              </div>
              {r.status !== 'cancelled' && (
                <button onClick={() => cancel(r.id)} className="btn-danger shrink-0">Cancelar</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
