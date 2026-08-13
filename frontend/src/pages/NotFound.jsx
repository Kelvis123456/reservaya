import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-5xl font-extrabold text-slate-900 mb-2">404</h1>
      <p className="text-slate-500 mb-6">No encontramos la página que buscas.</p>
      <Link to="/" className="btn-primary">Volver al inicio</Link>
    </div>
  );
}
