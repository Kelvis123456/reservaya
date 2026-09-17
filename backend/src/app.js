import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import * as Sentry from '@sentry/node';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);

app.use(notFoundHandler);

// Después de las rutas y el 404, antes del error handler propio: captura
// cualquier error de 5xx y lo reenvía sin tocar la respuesta que ya arma
// errorHandler.
Sentry.setupExpressErrorHandler(app);

app.use(errorHandler);

export default app;
