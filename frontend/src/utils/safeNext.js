/**
 * Ruta a la que volver después del login (?next=). Solo rutas internas: "//evil.com" o
 * "https://evil.com" convertirían el login en una redirección abierta.
 */
export function safeNext(value, fallback = '/') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}
