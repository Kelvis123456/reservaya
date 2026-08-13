import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

function renderProtected({ role } = {}) {
  return render(
    <MemoryRouter initialEntries={['/protegido']}>
      <Routes>
        <Route
          path="/protegido"
          element={
            <ProtectedRoute role={role}>
              <div>Contenido protegido</div>
            </ProtectedRoute>
          }
        />
        <Route path="/iniciar-sesion" element={<div>Página de login</div>} />
        <Route path="/" element={<div>Página de inicio</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('muestra un spinner mientras carga la sesión', () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    const { container } = renderProtected();
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('redirige a login si no hay usuario autenticado', () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    renderProtected();
    expect(screen.getByText('Página de login')).toBeInTheDocument();
  });

  it('redirige a inicio si el usuario no tiene el rol requerido', () => {
    useAuth.mockReturnValue({ user: { id: 1, role: 'client' }, loading: false });
    renderProtected({ role: 'owner' });
    expect(screen.getByText('Página de inicio')).toBeInTheDocument();
  });

  it('renderiza el contenido si el usuario está autenticado y tiene el rol correcto', () => {
    useAuth.mockReturnValue({ user: { id: 1, role: 'owner' }, loading: false });
    renderProtected({ role: 'owner' });
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
  });

  it('renderiza el contenido si no se exige un rol específico', () => {
    useAuth.mockReturnValue({ user: { id: 1, role: 'client' }, loading: false });
    renderProtected();
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
  });
});
