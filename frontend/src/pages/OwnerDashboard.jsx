import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, CalendarClock, ListChecks, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const EMPTY_FORM = { name: '', sportType: 'Fútbol', address: '', description: '', pricePerHour: '', imageUrl: '' };

function VenueForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onSubmit(form).finally(() => setSaving(false));
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Nombre</label>
          <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" />
        </div>
        <div>
          <label className="label">Deporte</label>
          <input required value={form.sportType} onChange={(e) => setForm((f) => ({ ...f, sportType: e.target.value }))} className="input" />
        </div>
      </div>
      <div>
        <label className="label">Dirección</label>
        <input required value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="input" />
      </div>
      <div>
        <label className="label">Descripción</label>
        <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input min-h-20 resize-none" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Precio por hora (RD$)</label>
          <input required type="number" min="0" step="0.01" value={form.pricePerHour} onChange={(e) => setForm((f) => ({ ...f, pricePerHour: e.target.value }))} className="input" />
        </div>
        <div>
          <label className="label">URL de imagen</label>
          <input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} className="input" placeholder="https://..." />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Guardar'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
      </div>
    </form>
  );
}

function ScheduleEditor({ venue, onSaved }) {
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
        <CalendarClock className="size-4.5 text-brand-600" /> Horario semanal
      </h3>
      <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 mb-4">
        {DAYS.map((label, d) => (
          <button
            key={d}
            type="button"
            onClick={() => toggleDay(d)}
            className={`rounded-lg border px-2 py-2 text-xs font-medium ${
              days.selected.has(d) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-400'
            }`}
          >
            {label.slice(0, 3)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">Hora de apertura</label>
          <input type="time" value={days.openTime} onChange={(e) => setDays((d) => ({ ...d, openTime: e.target.value }))} className="input w-36" />
        </div>
        <div>
          <label className="label">Hora de cierre</label>
          <input type="time" value={days.closeTime} onChange={(e) => setDays((d) => ({ ...d, closeTime: e.target.value }))} className="input w-36" />
        </div>
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Guardar horario'}</button>
      </div>
    </div>
  );
}

function VenueReservations({ venueId }) {
  const [reservations, setReservations] = useState(null);
  const { push } = useToast();

  function load() {
    api.get(`/reservations/venue/${venueId}`).then(({ data }) => setReservations(data));
  }

  useEffect(load, [venueId]);

  async function act(id, action) {
    try {
      await api.patch(`/reservations/${id}/${action}`);
      load();
    } catch (err) {
      push(err.response?.data?.message || 'No se pudo actualizar la reserva', 'error');
    }
  }

  if (reservations === null) return <Spinner />;

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <ListChecks className="size-4.5 text-brand-600" /> Reservas ({reservations.length})
      </h3>
      {reservations.length === 0 ? (
        <p className="text-sm text-slate-400">Todavía no hay reservas para esta cancha.</p>
      ) : (
        <div className="space-y-2">
          {reservations.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3">
              <div className="flex-1 text-sm">
                <span className="font-medium text-slate-800">{r.date}</span>
                <span className="text-slate-500"> · {r.startTime}-{r.endTime}</span>
              </div>
              <StatusBadge status={r.status} />
              {r.status === 'pending' && (
                <button onClick={() => act(r.id, 'confirm')} className="btn-secondary !py-1.5 !px-3 text-xs">Confirmar</button>
              )}
              {r.status !== 'cancelled' && (
                <button onClick={() => act(r.id, 'cancel')} className="btn-danger !py-1.5 !px-3 text-xs">Cancelar</button>
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

  function load() {
    api.get('/venues').then(({ data }) => setVenues(data.filter((v) => v.ownerId === user.id)));
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
    if (!confirm('¿Eliminar esta cancha? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/venues/${id}`);
      push('Cancha eliminada');
      load();
    } catch (err) {
      push(err.response?.data?.message || 'No se pudo eliminar la cancha', 'error');
    }
  }

  if (venues === null) return <Spinner />;

  const selected = venues.find((v) => v.id === selectedId);

  if (selected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <button onClick={() => setSelectedId(null)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="size-4" /> Volver a mis canchas
        </button>
        <h1 className="text-2xl font-bold text-slate-900">{selected.name}</h1>
        <ScheduleEditor venue={selected} onSaved={load} />
        <VenueReservations venueId={selected.id} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mi panel</h1>
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
                      <button onClick={() => setEditingId(v.id)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                        <Pencil className="size-4" />
                      </button>
                      <button onClick={() => deleteVenue(v.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                  <button onClick={() => setSelectedId(v.id)} className="btn-secondary w-full mt-4">
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
