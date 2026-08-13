import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import api from '../services/api';

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const ref = useRef(null);

  async function load() {
    try {
      const { data } = await api.get('/notifications/me');
      setNotifications(data);
    } catch {
      // silencioso: las notificaciones no son críticas para la navegación
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function markRead(id) {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
      >
        <Bell className="size-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center size-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto card shadow-xl z-40">
          <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm text-slate-700">
            Notificaciones
          </div>
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">No tienes notificaciones.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n._id}
                onClick={() => markRead(n._id)}
                className={`w-full text-left px-4 py-3 text-sm border-b border-slate-50 last:border-0 hover:bg-slate-50 ${
                  n.read ? 'text-slate-500' : 'text-slate-800 font-medium bg-brand-50/40'
                }`}
              >
                {n.message}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
