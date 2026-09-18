import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'client' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.role);
      push('¡Cuenta creada con éxito!');
      navigate('/');
    } catch (err) {
      push(err.response?.data?.message || 'No se pudo crear la cuenta', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-sm p-7">
        <div className="size-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
          <UserPlus className="size-5" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Crea tu cuenta</h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">Reserva canchas o publica las tuyas.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="register-name" className="label">Nombre</label>
            <input id="register-name" required value={form.name} onChange={(e) => update('name', e.target.value)} className="input" placeholder="Tu nombre" />
          </div>
          <div>
            <label htmlFor="register-email" className="label">Email</label>
            <input id="register-email" type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} className="input" placeholder="tu@email.com" />
          </div>
          <div>
            <label htmlFor="register-password" className="label">Contraseña</label>
            <input id="register-password" type="password" required minLength={6} value={form.password} onChange={(e) => update('password', e.target.value)} className="input" placeholder="Mínimo 6 caracteres" />
          </div>
          <fieldset>
            <legend className="label">Quiero...</legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'client', label: 'Reservar canchas' },
                { value: 'owner', label: 'Publicar mis canchas' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  aria-pressed={form.role === opt.value}
                  onClick={() => update('role', opt.value)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    form.role === opt.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-sm text-slate-500 mt-5 text-center">
          ¿Ya tienes cuenta? <Link to="/iniciar-sesion" className="text-brand-600 font-medium hover:text-brand-700">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
