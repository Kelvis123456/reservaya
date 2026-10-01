import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();
app.disable('x-powered-by');
// Render pone un proxy delante: sin esto el rate limit vería a todos con la misma IP.
app.set('trust proxy', 1);

// En producción sin CORS_ORIGIN se cierra (antes caía a '*').
const corsOrigin = process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? false : '*');
app.use(cors({ origin: corsOrigin }));
app.use(express.json());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Login y registro: frena el credential stuffing y los registros en masa (cada uno
// corre bcrypt, caro en el CPU del plan gratis). 20 intentos cada 15 min por IP.
if (process.env.NODE_ENV !== 'test') {
  app.use(['/api/auth/login', '/api/auth/register'], rateLimit({
    windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { message: 'Demasiados intentos. Espera unos minutos y vuelve a probar.' },
  }));
}
app.use('/api', routes);

app.use(notFoundHandler);

// Después de las rutas y el 404, antes del error handler propio: captura
// cualquier error de 5xx y lo reenvía sin tocar la respuesta que ya arma
// errorHandler.
Sentry.setupExpressErrorHandler(app);

app.use(errorHandler);

export default app;
