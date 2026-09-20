// Guarda el JWT solo en memoria (no en localStorage): un XSS ya no puede
// leerlo de almacenamiento persistente. A cambio, se pierde la sesión al
// recargar la página por completo (hay que volver a iniciar sesión).
let token = null;

export function getToken() {
  return token;
}

export function setToken(value) {
  token = value;
}
