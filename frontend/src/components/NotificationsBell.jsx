import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import api from '../services/api';

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  async function load() {
    try {
      const { data } = await api.get('/notifications/me');
      setNotifications(data);
    } catch {
      // silencioso: las notificaciones no son críticas para la navegación
    }
  }

  // Cada 20s, pero no con la pestaña oculta (cada pestaña abierta consultaba igual);
  // al volver a la pestaña se actualiza enseguida.
  useEffect(() => {
    load();
    const interval = setInterval(() => { if (!document.hidden) load(); }, 20000);
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector('[role="menuitem"]')?.focus();
  }, [open]);

  function closeAndRefocus() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onMenuKeyDown(e) {
    const items = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? []);
    if (e.key === 'Escape') {
      e.preventDefault();
      closeAndRefocus();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const currentIndex = items.indexOf(document.activeElement);
    const nextIndex = e.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;
    items[Math.max(0, Math.min(nextIndex, items.length - 1))]?.focus();
  }

  async function markRead(id) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    } catch {
      // no crítico: queda como no leída y se reintenta en el próximo clic
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors focus-visible:outline-2 focus-visible:outline-brand-700"
      >
        <Bell className="size-5 text-slate-600" aria-hidden="true" />
        {unreadCount > 0 && (
          <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 flex items-center justify-center size-4 rounded-full bg-red-600 text-white text-[10px] font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          onKeyDown={onMenuKeyDown}
          aria-label="Notificaciones"
          className="menu-pop absolute right-0 mt-2 w-[min(20rem,calc(100vw-1rem))] max-h-96 overflow-y-auto card shadow-xl z-40"
        >
          <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm text-slate-700">
            Notificaciones
          </div>
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No tienes notificaciones.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n._id}
                role="menuitem"
                onClick={() => markRead(n._id)}
                className={`w-full text-left px-4 py-3 text-sm border-b border-slate-50 last:border-0 hover:bg-slate-50 focus-visible:bg-slate-50 outline-none flex gap-2.5 ${
                  n.read ? 'text-slate-500' : 'text-slate-800 font-medium'
                }`}
              >
                {/* el fondo brand-50/40 casi no se veía: un punto marca las no leídas */}
                <span aria-hidden="true" className={`mt-1.5 size-1.5 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-brand-700'}`} />
                <span>
                  {!n.read && <span className="sr-only">Sin leer: </span>}
                  {n.message}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
