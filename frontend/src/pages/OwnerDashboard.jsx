import { useEffect, useId, useState } from 'react';
import { Plus, Pencil, Trash2, CalendarClock, ListChecks, ArrowLeft, WifiOff } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import { SPORTS } from '../constants';
import { formatDate } from '../utils/dates';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const EMPTY_FORM = { name: '', sportType: 'Fútbol', address: '', description: '', pricePerHour: '', imageUrl: '' };

function VenueForm({ initial, onSubmit, onCancel, nested = false }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const uid = useId();

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onSubmit(form).finally(() => setSaving(false));
  }

  return (
    // nested: dentro de la tarjeta de la cancha no lleva su propio borde (quedaba tarjeta dentro de tarjeta)
    <form onSubmit={handleSubmit} className={nested ? 'space-y-4' : 'card p-6 space-y-4'}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={`${uid}-name`} className="label">Nombre</label>
          <input id={`${uid}-name`} required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" />
        </div>
        <div>
          <label htmlFor={`${uid}-sport`} className="label">Deporte</label>
          {/* misma lista que el filtro de /canchas: con texto libre, "futbol" nunca aparecía al filtrar "Fútbol" */}
          <select id={`${uid}-sport`} required value={form.sportType} onChange={(e) => setForm((f) => ({ ...f, sportType: e.target.value }))} className="input">
            {[...new Set([...SPORTS, form.sportType].filter(Boolean))].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor={`${uid}-address`} className="label">Dirección</label>
        <input id={`${uid}-address`} required value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="input" />
      </div>
      <div>
        <label htmlFor={`${uid}-description`} className="label">Descripción</label>
        <textarea id={`${uid}-description`} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input min-h-20 resize-none" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={`${uid}-price`} className="label">Precio por hora (RD$)</label>
          <input id={`${uid}-price`} required type="number" min="0" step="0.01" value={form.pricePerHour} onChange={(e) => setForm((f) => ({ ...f, pricePerHour: e.target.value }))} className="input" />
        </div>
        <div>
          <label htmlFor={`${uid}-image`} className="label">URL de imagen</label>
          <input id={`${uid}-image`} value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} className="input" placeholder="https://..." />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Guardar'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
      </div>
    </form>
  );
}

function ScheduleEditor({ venue, onSaved }) {
  const uid = useId();
  const [days, setDays] = useState(() => {
    const active = new Set(venue.schedules?.map((s) => s.dayOfWeek));
    const first = venue.schedules?.[0];
    return {
      selected: active,
      openTime: first?.openTime || '08:00',
      closeTime: first?.closeTime || '22:00',
    };
  });
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  function toggleDay(d) {
    setDays((prev) => {
      const selected = new Set(prev.selected);
      selected.has(d) ? selected.delete(d) : selected.add(d);
      return { ...prev, selected };
    });
  }

  async function save() {
    setSaving(true);
    try {
      const schedules = [...days.selected].map((dayOfWeek) => ({
        dayOfWeek, openTime: days.openTime, closeTime: days.closeTime,
      }));
      const { data } = await api.put(`/venues/${venue.id}/schedule`, { schedules });
      onSaved(data);
      push('Horario actualizado');
    } catch (err) {
      push(err.response?.data?.message || 'No se pudo guardar el horario', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <CalendarClock className="size-4.5 text-brand-700" /> Horario semanal
      </h3>
      <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 mb-4">
        {DAYS.map((label, d) => (
          <button
            key={d}
            type="button"
            onClick={() => toggleDay(d)}
            aria-pressed={days.selected.has(d)}
            aria-label={label}
            className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-700 ${
              days.selected.has(d) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500'
            }`}
          >
            {label.slice(0, 3)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label htmlFor={`${uid}-open`} className="label">Hora de apertura</label>
          <input id={`${uid}-open`} type="time" value={days.openTime} onChange={(e) => setDays((d) => ({ ...d, openTime: e.target.value }))} className="input w-36" />
        </div>
        <div>
          <label htmlFor={`${uid}-close`} className="label">Hora de cierre</label>
          <input id={`${uid}-close`} type="time" value={days.closeTime} onChange={(e) => setDays((d) => ({ ...d, closeTime: e.target.value }))} className="input w-36" />
        </div>
        <button type="button" onClick={save} disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Guardar horario'}</button>
      </div>
    </div>
  );
}

function VenueReservations({ venueId }) {
  const [reservations, setReservations] = useState(null);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const { push } = useToast();

  function load() {
    setError(false);
    // antes sin catch: si fallaba, el spinner giraba para siempre
    api.get(`/reservations/venue/${venueId}`).then(({ data }) => setReservations(data)).catch(() => setError(true));
  }

  useEffect(load, [venueId]);

  async function act(id, action) {
    setBusyId(id);
    try {
      const { data } = await api.patch(`/reservations/${id}/${action}`);
      setReservations((list) => list.map((r) => (r.id === id ? { ...r, status: data.status } : r)));
      push(action === 'confirm' ? 'Reserva confirmada' : 'Reserva cancelada');
    } catch (err) {
      push(err.response?.data?.message || 'No se pudo actualizar la reserva', 'error');
      load(); // el estado pudo cambiar mientras tanto (ej. el cliente canceló): se refresca
    } finally {
      setBusyId(null);
      setConfirmCancelId(null);
    }
  }

  if (error) {
    return (
      <div className="card p-6 text-center">
        <WifiOff className="size-6 text-slate-500 mx-auto mb-2" aria-hidden="true" />
        <p className="text-sm text-slate-700">No pudimos cargar las reservas.</p>
        <button type="button" onClick={load} className="btn-secondary mt-3">Reintentar</button>
      </div>
    );
  }
  if (reservations === null) return <Spinner />;

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <ListChecks className="size-4.5 text-brand-700" /> Reservas ({reservations.length})
      </h3>
      {reservations.length === 0 ? (
        <p className="text-sm text-slate-500">Todavía no hay reservas para esta cancha.</p>
      ) : (
        <div className="space-y-2">
          {reservations.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 px-4 py-3">
              <div className="flex-1 min-w-48 text-sm">
                <p>
                  <span className="font-medium text-slate-800 first-letter:uppercase inline-block">{formatDate(r.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  <span className="text-slate-500 tabular-nums"> · {r.startTime}–{r.endTime} · RD$ {Number(r.totalPrice).toLocaleString('es-DO')}</span>
                </p>
                {r.user && <p className="text-slate-500 truncate">{r.user.name} · {r.user.email}</p>}
              </div>
              <StatusBadge status={r.status} />
              {r.status === 'pending' && (
                <button type="button" onClick={() => act(r.id, 'confirm')} disabled={busyId === r.id} className="btn-secondary !py-1.5 !px-3 text-xs">Confirmar</button>
              )}
              {r.status !== 'cancelled' && (
                confirmCancelId === r.id ? (
                  <span className="flex gap-1.5">
                    <button type="button" onClick={() => act(r.id, 'cancel')} disabled={busyId === r.id} className="btn-danger !py-1.5 !px-3 text-xs">Sí, cancelar</button>
                    <button type="button" onClick={() => setConfirmCancelId(null)} className="btn-secondary !py-1.5 !px-3 text-xs">No</button>
                  </span>
                ) : (
                  // cancelar la reserva de un cliente pide confirmación: un toque errado avisaba al cliente
                  <button type="button" onClick={() => setConfirmCancelId(r.id)} className="btn-danger !py-1.5 !px-3 text-xs">Cancelar</button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const { push } = useToast();
  const [venues, setVenues] = useState(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  function load() {
    setLoadError(false);
    api.get('/venues')
      .then(({ data }) => setVenues(data.filter((v) => v.ownerId === user.id)))
      .catch(() => setLoadError(true));
  }

  useEffect(load, [user.id]);

  async function createVenue(form) {
    try {
      await api.post('/venues', { ...form, pricePerHour: Number(form.pricePerHour) });
      push('Cancha creada');
      setCreating(false);
      load();
    } catch (err) {
      push(err.response?.data?.message || 'No se pudo crear la cancha', 'error');
    }
  }

  async function updateVenue(id, form) {
    try {
      await api.put(`/venues/${id}`, { ...form, pricePerHour: Number(form.pricePerHour) });
      push('Cancha actualizada');
      setEditingId(null);
      load();
    } catch (err) {
      push(err.response?.data?.message || 'No se pudo actualizar la cancha', 'error');
    }
  }

  async function deleteVenue(id) {
    setConfirmDeleteId(null);
    try {
      await api.delete(`/venues/${id}`);
      push('Cancha eliminada');
      load();
    } catch (err) {
      push(err.response?.data?.message || 'No se pudo eliminar la cancha', 'error');
    }
  }

  if (loadError) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="card p-10 text-center">
          <WifiOff className="size-8 text-slate-500 mx-auto mb-3" aria-hidden="true" />
          <p className="font-semibold text-slate-800">No pudimos cargar tus canchas</p>
          <button type="button" onClick={load} className="btn-secondary mt-5">Reintentar</button>
        </div>
      </div>
    );
  }
  if (venues === null) return <Spinner />;

  const selected = venues.find((v) => v.id === selectedId);

  if (selected) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        <button onClick={() => setSelectedId(null)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="size-4" /> Volver a mis canchas
        </button>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{selected.name}</h1>
        <ScheduleEditor venue={selected} onSaved={load} />
        <VenueReservations venueId={selected.id} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mi panel</h1>
          <p className="text-slate-500 text-sm">Administra tus canchas, horarios y reservas.</p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="btn-primary">
            <Plus className="size-4" /> Nueva cancha
          </button>
        )}
      </div>

      {creating && (
        <div className="mb-6">
          <VenueForm onSubmit={createVenue} onCancel={() => setCreating(false)} />
        </div>
      )}

      {venues.length === 0 && !creating ? (
        <div className="card p-10 text-center text-slate-500">Aún no has publicado ninguna cancha.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {venues.map((v) => (
            <div key={v.id} className="card p-5">
              {editingId === v.id ? (
                <VenueForm
                  initial={{ name: v.name, sportType: v.sportType, address: v.address, description: v.description, pricePerHour: v.pricePerHour, imageUrl: v.imageUrl }}
                  onSubmit={(form) => updateVenue(v.id, form)}
                  onCancel={() => setEditingId(null)}
                  nested
                />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block rounded-full bg-brand-50 text-brand-700 text-xs font-semibold px-2.5 py-0.5 mb-2">
                        {v.sportType}
                      </span>
                      <h3 className="font-semibold text-slate-900">{v.name}</h3>
                      <p className="text-sm text-slate-500">{v.address}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button type="button" onClick={() => setEditingId(v.id)} aria-label={`Editar ${v.name}`} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                        <Pencil className="size-4" />
                      </button>
                      <button type="button" onClick={() => setConfirmDeleteId(v.id)} aria-label={`Eliminar ${v.name}`} className="p-2 rounded-lg hover:bg-red-50 text-red-700">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                  {/* confirmación en la tarjeta en vez del confirm() nativo del navegador */}
                  {confirmDeleteId === v.id && (
                    <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">
                      <p>¿Eliminar "{v.name}"? No se puede deshacer.</p>
                      <div className="mt-2 flex gap-2">
                        <button type="button" onClick={() => deleteVenue(v.id)} className="btn-danger !bg-red-700 !text-white !py-1.5">Eliminar</button>
                        <button type="button" onClick={() => setConfirmDeleteId(null)} className="btn-secondary !py-1.5">Cancelar</button>
                      </div>
                    </div>
                  )}
                  <button type="button" onClick={() => setSelectedId(v.id)} className="btn-secondary w-full mt-4">
                    Gestionar horario y reservas
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
