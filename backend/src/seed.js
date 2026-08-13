import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { sequelize, User, Venue, Schedule, Reservation } from './models/sql/index.js';
import { connectMongo } from './config/mongo.js';
import Review from './models/nosql/Review.js';
import Notification from './models/nosql/Notification.js';

async function seed() {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
  await connectMongo();
  await Review.deleteMany({});
  await Notification.deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 10);

  const owner = await User.create({ name: 'Carlos Dueño', email: 'owner@reservaya.com', passwordHash, role: 'owner' });
  const client = await User.create({ name: 'Ana Cliente', email: 'client@reservaya.com', passwordHash, role: 'client' });

  const venue1 = await Venue.create({
    name: 'Cancha Central Fútbol 5',
    sportType: 'Fútbol',
    address: 'Av. Principal 123, Santo Domingo',
    description: 'Cancha sintética techada con iluminación LED, ideal para partidos nocturnos.',
    pricePerHour: 1500,
    imageUrl: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800',
    ownerId: owner.id,
  });

  const venue2 = await Venue.create({
    name: 'Polideportivo Los Robles',
    sportType: 'Baloncesto',
    address: 'Calle Duarte 45, Santiago',
    description: 'Cancha techada de baloncesto con gradas y vestidores.',
    pricePerHour: 1200,
    imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
    ownerId: owner.id,
  });

  const venue3 = await Venue.create({
    name: 'Club de Tenis Vista Verde',
    sportType: 'Tenis',
    address: 'Carr. Turística km 3, Punta Cana',
    description: 'Cancha de arcilla profesional, alquiler de raquetas incluido.',
    pricePerHour: 900,
    imageUrl: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800',
    ownerId: owner.id,
  });

  const weekdaySchedule = (venueId) =>
    [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ venueId, dayOfWeek, openTime: '08:00', closeTime: '22:00' }));

  await Schedule.bulkCreate([
    ...weekdaySchedule(venue1.id),
    ...weekdaySchedule(venue2.id),
    ...weekdaySchedule(venue3.id),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const reservation = await Reservation.create({
    venueId: venue1.id,
    userId: client.id,
    date: today,
    startTime: '18:00',
    endTime: '19:00',
    status: 'confirmed',
    totalPrice: venue1.pricePerHour,
  });

  await Review.create({
    venueId: venue1.id,
    userId: client.id,
    userName: client.name,
    rating: 5,
    comment: 'Excelente cancha, muy buena iluminación de noche.',
    tags: ['iluminación', 'limpieza'],
  });

  await Notification.create({
    userId: owner.id,
    type: 'reservation_created',
    message: `Nueva reserva de ${client.name} para "${venue1.name}" el ${today} de 18:00 a 19:00`,
    metadata: { reservationId: reservation.id, venueId: venue1.id },
  });

  console.log('Datos de ejemplo creados correctamente.');
  console.log('Login dueño:  owner@reservaya.com  / password123');
  console.log('Login cliente: client@reservaya.com / password123');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
