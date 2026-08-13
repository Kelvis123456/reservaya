import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
