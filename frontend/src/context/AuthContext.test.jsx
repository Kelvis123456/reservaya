import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

function Harness() {
  const { user, loading, login, register, logout } = useAuth();
  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="user">{user ? user.email : 'none'}</div>
      <button onClick={() => login('a@test.com', 'pw').catch(() => {})}>login</button>
      <button onClick={() => register('N', 'n@test.com', 'pw', 'client').catch(() => {})}>register</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

function renderHarness() {
  return render(
    <AuthProvider>
      <Harness />
    </AuthProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('AuthContext', () => {
  it('sin token guardado, termina de cargar con usuario nulo y no llama a /auth/me', async () => {
    renderHarness();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(api.get).not.toHaveBeenCalled();
  });

  it('con token guardado válido, recupera el usuario vía /auth/me', async () => {
    localStorage.setItem('reservaya_token', 'un-token');
    api.get.mockResolvedValueOnce({ data: { user: { id: 1, email: 'existente@test.com', role: 'client' } } });

    renderHarness();
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('existente@test.com'));
  });

  it('con token inválido, /auth/me falla y el token se elimina', async () => {
    localStorage.setItem('reservaya_token', 'token-invalido');
    api.get.mockRejectedValueOnce(new Error('401'));

    renderHarness();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(localStorage.getItem('reservaya_token')).toBeNull();
  });

  it('login exitoso guarda el token y actualiza el usuario', async () => {
    api.post.mockResolvedValueOnce({ data: { token: 'nuevo-token', user: { id: 2, email: 'a@test.com', role: 'client' } } });
    renderHarness();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await userEvent.click(screen.getByText('login'));

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('a@test.com'));
    expect(localStorage.getItem('reservaya_token')).toBe('nuevo-token');
  });

  it('login fallido NO guarda token y el usuario sigue nulo', async () => {
    api.post.mockRejectedValueOnce({ response: { data: { message: 'Credenciales inválidas' } } });
    renderHarness();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await userEvent.click(screen.getByText('login'));

    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(localStorage.getItem('reservaya_token')).toBeNull();
  });

  it('logout elimina el token y limpia el usuario', async () => {
    api.post.mockResolvedValueOnce({ data: { token: 'nuevo-token', user: { id: 2, email: 'a@test.com', role: 'client' } } });
    renderHarness();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('a@test.com'));

    await userEvent.click(screen.getByText('logout'));

    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(localStorage.getItem('reservaya_token')).toBeNull();
  });
});
