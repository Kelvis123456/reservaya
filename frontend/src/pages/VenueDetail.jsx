import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { MapPin, Star, Calendar, Clock, Loader2, ArrowLeft, WifiOff } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';
import StarRating from '../components/StarRating';
import { formatDate, todayIn } from '../utils/dates';

const money = (n) => `RD$ ${Number(n).toLocaleString('es-DO')}`;

function BookButton({ booking, onBook, className = '' }) {
  return (
    <button type="button" onClick={onBook} disabled={booking} className={`btn-primary ${className}`}>
      {booking ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Reservando…</> : 'Reservar'}
    </button>
  );
}

export default function VenueDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [venue, setVenue] = useState(null);
  const [loadState, setLoadState] = useState('loading'); // loading | ok | notFound | error
  const [reloadKey, setReloadKey] = useState(0);
  const [date, setDate] = useState(() => todayIn());
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [booking, setBooking] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [canReview, setCanReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    setLoadState('loading');
    api.get(`/venues/${id}`)
      .then(({ data }) => { setVenue(data); setLoadState('ok'); })
      // antes cualquier error de red mostraba "Cancha no encontrada"
      .catch((err) => setLoadState(err.response?.status === 404 ? 'notFound' : 'error'));
    api.get(`/reviews/venue/${id}`).then(({ data }) => setReviews(data)).catch(() => {});
  }, [id, reloadKey]);

  // El formulario de reseña solo para quien ya jugó acá y todavía no reseñó (el backend
  // lo exige; antes se enteraba con un 403 después de escribir todo).
  useEffect(() => {
    if (user?.role !== 'client') { setCanReview(false); return; }
    const today = todayIn();
    api.get('/reservations/me').then(({ data }) => {
      const played = data.some((r) => String(r.venueId) === String(id) && r.status === 'confirmed' && r.date < today);
      setCanReview(played && !reviews.some((r) => r.userId === user.id));
    }).catch(() => setCanReview(false));
  }, [user, id, reviews]);

  useEffect(() => {
    if (!date) return;
    setSlotsLoading(true);
    setSelected(null);
    api.get(`/venues/${id}/availability`, { params: { date } })
      .then(({ data }) => setSlots(data.slots))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [id, date]);

  // Tocar un horario lo selecciona; la reserva se hace desde el resumen. Antes un toque
  // (fácil de dar sin querer en el celular) reservaba directo.
  function pickSlot(slot) {
    if (!user) {
      navigate(`/iniciar-sesion?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    if (user.role !== 'client') return push('Solo los clientes pueden reservar canchas', 'error');
    setSelected((cur) => (cur?.startTime === slot.startTime ? null : slot));
  }

  async function handleBook() {
    if (!selected) return;
    setBooking(true);
    try {
      await api.post('/reservations', {
        venueId: Number(id),
        date,
        startTime: selected.startTime,
        endTime: selected.endTime,
      });
      push(`Reserva creada: ${formatDate(date)}, ${selected.startTime} a ${selected.endTime}`);
      setSelected(null);
      const { data } = await api.get(`/venues/${id}/availability`, { params: { date } });
      setSlots(data.slots);
    } catch (err) {
      push(err.response?.data?.message || 'No se pudo crear la reserva', 'error');
    } finally {
      setBooking(false);
    }
  }

  async function submitReview(e) {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      const { data } = await api.post('/reviews', { venueId: Number(id), ...reviewForm });
      setReviews((prev) => [data, ...prev]);
      setReviewForm({ rating: 5, comment: '' });
      push('¡Gracias por tu reseña!');
    } catch (err) {
      push(err.response?.data?.message || 'No se pudo publicar la reseña', 'error');
    } finally {
      setSubmittingReview(false);
    }
  }

  if (loadState === 'loading') return <Spinner />;
  if (loadState !== 'ok') {
    const notFound = loadState === 'notFound';
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        {!notFound && <WifiOff className="size-8 text-slate-500 mx-auto mb-3" aria-hidden="true" />}
        <h1 className="text-2xl font-bold text-slate-900">{notFound ? 'Cancha no encontrada' : 'No pudimos cargar la cancha'}</h1>
        <p className="text-slate-500 mt-2">{notFound ? 'Puede que la hayan quitado o que el enlace esté mal.' : 'Revisa tu conexión e inténtalo de nuevo.'}</p>
        <div className="mt-6 flex justify-center gap-2">
          {!notFound && <button type="button" onClick={() => setReloadKey((n) => n + 1)} className="btn-primary">Reintentar</button>}
          <Link to="/canchas" className="btn-secondary"><ArrowLeft className="size-4" aria-hidden="true" /> Volver a canchas</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-10 pb-28 lg:pb-10 grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div className="rounded-2xl overflow-hidden aspect-[16/8] bg-slate-100">
          <img src={venue.imageUrl} alt={venue.name} className="w-full h-full object-cover" />
        </div>

        <div>
          <span className="inline-block rounded-full bg-brand-50 text-brand-700 text-xs font-semibold px-2.5 py-0.5 mb-2">
            {venue.sportType}
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{venue.name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-slate-500 text-sm">
            <MapPin className="size-4 shrink-0" aria-hidden="true" /> {venue.address}
          </p>
          {venue.avgRating != null && (
            <p className="mt-2 flex items-center gap-1 text-sm text-slate-600">
              <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" /> {venue.avgRating} · {venue.reviewCount} reseñas
            </p>
          )}
          <p className="mt-4 text-slate-600 leading-relaxed">{venue.description}</p>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar className="size-4.5 text-brand-700" aria-hidden="true" /> Disponibilidad
          </h2>
          <input
            type="date"
            aria-label="Fecha de disponibilidad"
            value={date}
            min={todayIn()}
            onChange={(e) => setDate(e.target.value)}
            className="input max-w-xs mb-5"
          />
          {slotsLoading && slots.length === 0 ? (
            <Spinner />
          ) : slots.length === 0 ? (
            <p className="text-sm text-slate-500">Esta cancha no abre ese día.</p>
          ) : (
            <div className={`grid grid-cols-3 sm:grid-cols-4 gap-2 transition-opacity duration-150 ${slotsLoading ? 'opacity-60' : ''}`}>
              {slots.map((slot) => {
                const isSelected = selected?.startTime === slot.startTime;
                return (
                  <button
                    key={slot.startTime}
                    type="button"
                    disabled={!slot.available}
                    aria-pressed={slot.available ? isSelected : undefined}
                    onClick={() => pickSlot(slot)}
                    className={`rounded-xl border px-2 py-2.5 text-sm font-medium flex items-center justify-center gap-1 tabular-nums transition-[color,background-color,transform] duration-150 ease-(--ease-out) active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${
                      !slot.available
                        ? 'border-slate-200 bg-slate-100 text-slate-500 line-through cursor-not-allowed'
                        : isSelected
                          ? 'border-brand-700 bg-brand-700 text-white'
                          : 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100'
                    }`}
                  >
                    <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                    {slot.startTime}
                    {!slot.available && <span className="sr-only">{slot.past ? '(ya pasó)' : '(ocupado)'}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Reseñas ({reviews.length})</h2>

          {canReview && (
            <form onSubmit={submitReview} className="mb-6 pb-6 border-b border-slate-100 space-y-3">
              <StarRating value={reviewForm.rating} onChange={(rating) => setReviewForm((f) => ({ ...f, rating }))} />
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                placeholder="Cuéntanos tu experiencia..."
                aria-label="Comentario de tu reseña"
                maxLength={1000}
                className="input min-h-20 resize-none"
              />
              <button type="submit" disabled={submittingReview} className="btn-primary">
                {submittingReview ? 'Publicando...' : 'Publicar reseña'}
              </button>
            </form>
          )}

          {reviews.length === 0 ? (
            <p className="text-sm text-slate-500">Todavía no hay reseñas.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r._id} className="pb-4 border-b border-slate-50 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800 text-sm">{r.userName}</span>
                    <StarRating value={r.rating} readOnly size={14} />
                  </div>
                  {r.comment && <p className="text-sm text-slate-600 mt-1">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <aside className="hidden lg:block lg:sticky lg:top-24 h-fit card p-6">
        <p className="text-sm text-slate-500">Precio por hora</p>
        <p className="text-3xl font-bold text-slate-900 tabular-nums">{money(venue.pricePerHour)}</p>
        {selected ? (
          <div className="mt-4 rounded-xl bg-brand-50 p-4">
            <p className="text-sm font-semibold text-slate-900 first-letter:uppercase">{formatDate(date)}</p>
            <p className="text-sm text-slate-600 tabular-nums">{selected.startTime} – {selected.endTime} · {money(venue.pricePerHour)}</p>
            <BookButton booking={booking} onBook={handleBook} className="w-full mt-3" />
          </div>
        ) : (
          <p className="text-sm text-slate-500 mt-4">Elige un horario disponible para ver el resumen y reservar.</p>
        )}
      </aside>

      {/* En el celular el resumen va pegado abajo, encima de las pestañas, en vez de quedar
          después de las reseñas (a ~1900px del horario elegido). */}
      <div className="lg:hidden fixed inset-x-0 bottom-16 z-20 border-t border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-3">
        {selected ? (
          <>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate first-letter:uppercase">{formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' })} · {selected.startTime}</p>
              <p className="text-sm text-slate-600 tabular-nums">{money(venue.pricePerHour)}</p>
            </div>
            <BookButton booking={booking} onBook={handleBook} className="shrink-0" />
          </>
        ) : (
          <>
            <p className="text-sm text-slate-500">Elige un horario para reservar</p>
            <p className="text-sm font-semibold text-slate-900 tabular-nums shrink-0">{money(venue.pricePerHour)}/h</p>
          </>
        )}
      </div>
    </div>
  );
}
