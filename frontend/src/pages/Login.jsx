import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { safeNext } from '../utils/safeNext';

const DEMO = {
  owner: { email: 'owner@reservaya.com', label: 'Dueño' },
  client: { email: 'client@reservaya.com', label: 'Cliente' },
};
const DEMO_PASSWORD = 'password123';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      push('¡Bienvenido de nuevo!');
      navigate(next, { replace: true });
    } catch (err) {
      push(err.response?.data?.message || 'No se pudo iniciar sesión', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80svh] flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-sm p-7">
        <div className="size-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center mb-4">
          <LogIn className="size-5" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Inicia sesión</h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">Accede para reservar o administrar tus canchas.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="label">Email</label>
            <input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="tu@email.com" />
          </div>
          <div>
            <label htmlFor="login-password" className="label">Contraseña</label>
            <input id="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-sm text-slate-500 mt-5 text-center">
          ¿No tienes cuenta? <Link to="/registro" className="text-brand-700 font-medium hover:text-brand-800">Regístrate</Link>
        </p>

        {/* Es un proyecto de portfolio: las cuentas demo son públicas a propósito. El texto
            antes era slate-400 de 12px (2.63:1); ahora es una caja legible con botones. */}
        <div className="mt-5 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          <p className="font-medium text-slate-700">¿Solo quieres probarlo?</p>
          <p className="mt-0.5">Entra con una cuenta demo (contraseña <span className="font-mono">{DEMO_PASSWORD}</span>):</p>
          <div className="mt-2 flex gap-2">
            {Object.values(DEMO).map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => { setEmail(d.email); setPassword(DEMO_PASSWORD); }}
                className="btn-secondary flex-1 !py-1.5"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
