import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

const ToastContext = createContext(null);
let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message, type = 'success') => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`card flex items-start gap-2.5 px-4 py-3 shadow-lg animate-[fadeIn_0.2s_ease-out] ${
              t.type === 'error' ? 'border-red-200' : 'border-brand-200'
            }`}
          >
            {t.type === 'error' ? (
              <XCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="size-5 text-brand-600 shrink-0 mt-0.5" />
            )}
            <p className="text-sm text-slate-700 flex-1">{t.message}</p>
            <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-slate-600">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}
