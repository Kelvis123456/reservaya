import 'dotenv/config';
import app from './app.js';
import { sequelize } from './models/sql/index.js';
import { connectMongo } from './config/mongo.js';

const PORT = process.env.PORT || 4000;

async function start() {
  await sequelize.authenticate();
  console.log('PostgreSQL conectado');

  await sequelize.sync();
  console.log('Modelos de PostgreSQL sincronizados');

  await connectMongo();

  app.listen(PORT, () => {
    console.log(`API escuchando en http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
