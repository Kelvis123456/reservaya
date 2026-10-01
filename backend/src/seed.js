import 'dotenv/config';
import { sequelize } from './models/sql/index.js';
import { connectMongo } from './config/mongo.js';
import Review from './models/nosql/Review.js';
import Notification from './models/nosql/Notification.js';
import { insertDemoData, DEMO_PASSWORD } from './demoData.js';

// Reinicia la base local: sync({ force: true }) BORRA todas las tablas. Nunca contra producción
// (desde un shell de Render DATABASE_URL apunta a la base real). Para poblar producción vacía
// está SEED_DEMO_IF_EMPTY=true en el arranque del servidor, que no borra nada.
if (process.env.NODE_ENV === 'production') {
  console.error('seed.js borra la base completa y no corre con NODE_ENV=production. Usa SEED_DEMO_IF_EMPTY=true.');
  process.exit(1);
}

async function seed() {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
  await connectMongo();
  await Review.deleteMany({});
  await Notification.deleteMany({});

  await insertDemoData();

  console.log('Datos de ejemplo creados correctamente.');
  console.log(`Login dueño:  owner@reservaya.com  / ${DEMO_PASSWORD}`);
  console.log(`Login cliente: client@reservaya.com / ${DEMO_PASSWORD}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
