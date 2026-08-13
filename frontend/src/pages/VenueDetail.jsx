import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Star, Calendar, Clock } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';
import StarRating from '../components/StarRating';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function VenueDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { push } = useToast();

  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    api.get(`/venues/${id}`).then(({ data }) => setVenue(data)).finally(() => setLoading(false));
    api.get(`/reviews/venue/${id}`).then(({ data }) => setReviews(data));
  }, [id]);

  useEffect(() => {
    if (!date) return;
    setSlotsLoading(true);
    api.get(`/venues/${id}/availability`, { params: { date } })
      .then(({ data }) => setSlots(data.slots))
      .finally(() => setSlotsLoading(false));
  }, [id, date]);

  async function handleBook(slot) {
    if (!user) return push('Inicia sesión para reservar', 'error');
    if (user.role !== 'client') return push('Solo los clientes pueden reservar canchas', 'error');

    setBooking(slot.startTime);
    try {
      await api.post('/reservations', {
        venueId: Number(id),
        date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
      push(`Reserva creada para ${date} de ${slot.startTime} a ${slot.endTime}`);
      const { data } = await api.get(`/venues/${id}/availability`, { params: { date } });
      setSlots(data.slots);
    } catch (err) {
      push(err.response?.data?.message || 'No se pudo crear la reserva', 'error');
    } finally {
      setBooking(null);
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

  if (loading) return <Spinner />;
  if (!venue) return <p className="text-center py-20 text-slate-400">Cancha no encontrada.</p>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div className="rounded-2xl overflow-hidden aspect-[16/8] bg-slate-100">
          <img src={venue.imageUrl} alt={venue.name} className="w-full h-full object-cover" />
        </div>

        <div>
          <span className="inline-block rounded-full bg-brand-50 text-brand-700 text-xs font-semibold px-2.5 py-0.5 mb-2">
            {venue.sportType}
          </span>
          <h1 className="text-2xl font-bold text-slate-900">{venue.name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-slate-500 text-sm">
            <MapPin className="size-4" /> {venue.address}
          </p>
          {venue.avgRating != null && (
            <p className="mt-2 flex items-center gap-1 text-sm text-slate-600">
              <Star className="size-4 fill-amber-400 text-amber-400" /> {venue.avgRating} · {venue.reviewCount} reseñas
            </p>
          )}
          <p className="mt-4 text-slate-600 leading-relaxed">{venue.description}</p>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar className="size-4.5 text-brand-600" /> Disponibilidad
          </h2>
          <input
            type="date"
            value={date}
            min={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="input max-w-xs mb-5"
          />
          {slotsLoading ? (
            <Spinner />
          ) : slots.length === 0 ? (
            <p className="text-sm text-slate-400">Esta cancha no abre ese día.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.startTime}
                  disabled={!slot.available || booking === slot.startTime}
                  onClick={() => handleBook(slot)}
                  className={`rounded-xl border px-2 py-2.5 text-sm font-medium flex items-center justify-center gap-1 transition-colors ${
                    slot.available
                      ? 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100'
                      : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                  }`}
                >
                  <Clock className="size-3.5" />
                  {booking === slot.startTime ? '...' : slot.startTime}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Reseñas ({reviews.length})</h2>

          {user?.role === 'client' && (
            <form onSubmit={submitReview} className="mb-6 pb-6 border-b border-slate-100 space-y-3">
              <StarRating value={reviewForm.rating} onChange={(rating) => setReviewForm((f) => ({ ...f, rating }))} />
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                placeholder="Cuéntanos tu experiencia..."
                className="input min-h-20 resize-none"
              />
              <button disabled={submittingReview} className="btn-primary">
                {submittingReview ? 'Publicando...' : 'Publicar reseña'}
              </button>
            </form>
          )}

          {reviews.length === 0 ? (
            <p className="text-sm text-slate-400">Todavía no hay reseñas.</p>
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

      <aside className="lg:sticky lg:top-24 h-fit card p-6">
        <p className="text-sm text-slate-500">Precio por hora</p>
        <p className="text-3xl font-bold text-slate-900">RD$ {Number(venue.pricePerHour).toLocaleString()}</p>
        <p className="text-sm text-slate-500 mt-4">
          Selecciona un horario disponible en el calendario para reservar al instante.
        </p>
      </aside>
    </div>
  );
}
