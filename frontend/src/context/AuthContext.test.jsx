import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import api from '../services/api';
import { getToken, setToken } from '../services/tokenStore';

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
  setToken(null);
  vi.clearAllMocks();
});

describe('AuthContext', () => {
  it('sin token guardado, termina de cargar con usuario nulo y no llama a /auth/me', async () => {
    renderHarness();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(api.get).not.toHaveBeenCalled();
  });

  it('con token en memoria válido, recupera el usuario vía /auth/me', async () => {
    setToken('un-token');
    api.get.mockResolvedValueOnce({ data: { user: { id: 1, email: 'existente@test.com', role: 'client' } } });

    renderHarness();
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('existente@test.com'));
  });

  it('con token inválido, /auth/me falla y el token se elimina', async () => {
    setToken('token-invalido');
    api.get.mockRejectedValueOnce(new Error('401'));

    renderHarness();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(getToken()).toBeNull();
  });

  it('login exitoso guarda el token en memoria y actualiza el usuario', async () => {
    api.post.mockResolvedValueOnce({ data: { token: 'nuevo-token', user: { id: 2, email: 'a@test.com', role: 'client' } } });
    renderHarness();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await userEvent.click(screen.getByText('login'));

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('a@test.com'));
    expect(getToken()).toBe('nuevo-token');
  });

  it('login fallido NO guarda token y el usuario sigue nulo', async () => {
    api.post.mockRejectedValueOnce({ response: { data: { message: 'Credenciales inválidas' } } });
    renderHarness();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await userEvent.click(screen.getByText('login'));

    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(getToken()).toBeNull();
  });

  it('logout elimina el token de memoria y limpia el usuario', async () => {
    api.post.mockResolvedValueOnce({ data: { token: 'nuevo-token', user: { id: 2, email: 'a@test.com', role: 'client' } } });
    renderHarness();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('a@test.com'));

    await userEvent.click(screen.getByText('logout'));

    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(getToken()).toBeNull();
  });
});
