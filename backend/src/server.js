import 'dotenv/config';
import './instrument.js';

// Import después de instrument.js para que Sentry.init() ya haya corrido
// antes de que se carguen Express y el resto de la app.
const { default: app } = await import('./app.js');
const { sequelize } = await import('./models/sql/index.js');
const { connectMongo } = await import('./config/mongo.js');

const PORT = process.env.PORT || 4000;

async function start() {
  await sequelize.authenticate();
  console.log('PostgreSQL conectado');

  await sequelize.sync();
  console.log('Modelos de PostgreSQL sincronizados');

  await connectMongo();

  // Puebla con los datos demo solo si la base está vacía (el plan gratis de Render no da
  // shell para correr el seed, y el demo del portfolio necesita canchas y cuentas).
  if (process.env.SEED_DEMO_IF_EMPTY === 'true') {
    const { User } = await import('./models/sql/index.js');
    if ((await User.count()) === 0) {
      const { insertDemoData } = await import('./demoData.js');
      await insertDemoData();
      console.log('Base vacía: datos demo creados');
    }
  }

  app.listen(PORT, () => {
    console.log(`API escuchando en http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
