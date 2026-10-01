import axios from 'axios';
import { getToken } from './tokenStore';

// El plan gratis de Render duerme el servicio a los 15 min sin tráfico y la primera
// request tarda 30-60s en despertarlo. Sin timeout, eso era un spinner mudo para siempre.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 70000,
});

// Avisa a la UI cuando hay requests que llevan más de 3s (ColdStartNotice).
const SLOW_MS = 3000;
let slowCount = 0;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(slowCount > 0));
export function onSlowRequests(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function settle(config) {
  clearTimeout(config.slowTimer);
  if (config.markedSlow) { slowCount--; config.markedSlow = false; emit(); }
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.slowTimer = setTimeout(() => { config.markedSlow = true; slowCount++; emit(); }, SLOW_MS);
  return config;
});

api.interceptors.response.use(
  (res) => { settle(res.config); return res; },
  async (err) => {
    const config = err.config;
    if (config) settle(config);
    // Un reintento para lecturas que fallaron por red/timeout (típico al despertar el
    // servidor). Nunca para escrituras: reintentar un POST podría reservar dos veces.
    if (config && !config.retried && config.method === 'get' && !err.response) {
      config.retried = true;
      return api(config);
    }
    return Promise.reject(err);
  }
);

export default api;
