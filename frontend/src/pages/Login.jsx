import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      push('¡Bienvenido de nuevo!');
      navigate('/');
    } catch (err) {
      push(err.response?.data?.message || 'No se pudo iniciar sesión', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-sm p-7">
        <div className="size-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
          <LogIn className="size-5" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Inicia sesión</h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">Accede para reservar o administrar tus canchas.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="tu@email.com" />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" />
          </div>
          <button disabled={loading} className="btn-primary w-full">
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-sm text-slate-500 mt-5 text-center">
          ¿No tienes cuenta? <Link to="/registro" className="text-brand-600 font-medium hover:text-brand-700">Regístrate</Link>
        </p>

        <div className="mt-5 pt-5 border-t border-slate-100 text-xs text-slate-400 space-y-1">
          <p>Cuentas de prueba (tras ejecutar el seed):</p>
          <p>Dueño: owner@reservaya.com / password123</p>
          <p>Cliente: client@reservaya.com / password123</p>
        </div>
      </div>
    </div>
  );
}
