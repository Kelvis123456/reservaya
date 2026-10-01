export function notFoundHandler(req, res) {
  res.status(404).json({ message: 'Ruta no encontrada' });
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  // En 5xx el mensaje es interno (SQL de Postgres, nombres de columnas, casts de Mongo):
  // se loguea y se manda a Sentry, pero al cliente le llega uno genérico.
  const message = status >= 500 ? 'Error interno del servidor' : err.message || 'Solicitud inválida';
  res.status(status).json({ message });
}
