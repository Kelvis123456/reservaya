import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { sequelize } from '../src/models/sql/index.js';
import mongoose, { connectMongo } from '../src/config/mongo.js';
import Review from '../src/models/nosql/Review.js';
import Notification from '../src/models/nosql/Notification.js';

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await connectMongo();
  await Review.deleteMany({});
  await Notification.deleteMany({});
});

afterAll(async () => {
  await sequelize.close();
  await mongoose.connection.close();
});

async function registerUser(overrides = {}) {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Test User',
    email: `user_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
    password: 'password123',
    role: 'client',
    ...overrides,
  });
  return res.body;
}

describe('Auth', () => {
  it('registra un usuario nuevo y devuelve token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ana', email: 'ana@test.com', password: 'password123', role: 'client',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('ana@test.com');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rechaza el registro con un email ya usado', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ana 2', email: 'ana@test.com', password: 'otraPassword', role: 'client',
    });
    expect(res.status).toBe(409);
  });

  it('rechaza el registro sin campos obligatorios', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'incompleto@test.com' });
    expect(res.status).toBe(400);
  });

  it('rechaza login con contraseña incorrecta', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ana@test.com', password: 'incorrecta' });
    expect(res.status).toBe(401);
  });

  it('rechaza login con email inexistente', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'no-existe@test.com', password: 'x' });
    expect(res.status).toBe(401);
  });

  it('rechaza /me sin token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rechaza /me con un token inválido', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer token-falso');
    expect(res.status).toBe(401);
  });
});

describe('Venues', () => {
  let ownerToken, ownerId, otherOwnerToken, clientToken, venueId;

  beforeAll(async () => {
    const owner = await registerUser({ role: 'owner', email: 'owner1@test.com' });
    ownerToken = owner.token;
    ownerId = owner.user.id;
    const otherOwner = await registerUser({ role: 'owner', email: 'owner2@test.com' });
    otherOwnerToken = otherOwner.token;
    const client = await registerUser({ role: 'client', email: 'client1@test.com' });
    clientToken = client.token;
  });

  it('rechaza crear cancha sin autenticación', async () => {
    const res = await request(app).post('/api/venues').send({ name: 'X' });
    expect(res.status).toBe(401);
  });

  it('rechaza crear cancha si el usuario es cliente, no dueño', async () => {
    const res = await request(app)
      .post('/api/venues')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ name: 'Cancha X', sportType: 'Fútbol', address: 'Calle 1', pricePerHour: 100 });
    expect(res.status).toBe(403);
  });

  it('rechaza crear cancha con campos incompletos', async () => {
    const res = await request(app)
      .post('/api/venues')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Cancha incompleta' });
    expect(res.status).toBe(400);
  });

  it('permite a un dueño crear una cancha', async () => {
    const res = await request(app)
      .post('/api/venues')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Cancha Test', sportType: 'Fútbol', address: 'Calle 1', pricePerHour: 500 });
    expect(res.status).toBe(201);
    expect(res.body.ownerId).toBe(ownerId);
    venueId = res.body.id;
  });

  it('devuelve 404 al pedir una cancha que no existe', async () => {
    const res = await request(app).get('/api/venues/999999');
    expect(res.status).toBe(404);
  });

  it('rechaza editar una cancha que no le pertenece al usuario', async () => {
    const res = await request(app)
      .put(`/api/venues/${venueId}`)
      .set('Authorization', `Bearer ${otherOwnerToken}`)
      .send({ name: 'Hackeada' });
    expect(res.status).toBe(403);
  });

  it('rechaza borrar una cancha que no le pertenece al usuario', async () => {
    const res = await request(app)
      .delete(`/api/venues/${venueId}`)
      .set('Authorization', `Bearer ${otherOwnerToken}`);
    expect(res.status).toBe(403);
  });

  it('rechaza configurar horario con un formato inválido', async () => {
    const res = await request(app)
      .put(`/api/venues/${venueId}/schedule`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ schedules: 'no-es-un-arreglo' });
    expect(res.status).toBe(400);
  });

  it('permite al dueño configurar el horario semanal', async () => {
    const today = new Date().getDay();
    const res = await request(app)
      .put(`/api/venues/${venueId}/schedule`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ schedules: [{ dayOfWeek: today, openTime: '08:00', closeTime: '12:00' }] });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('exporta venueId para las pruebas de reservas', () => {
    expect(venueId).toBeTruthy();
  });
});

describe('Reservations', () => {
  let ownerToken, clientToken, otherClientToken, venueId, reservationId;
  const today = new Date().toISOString().slice(0, 10);

  beforeAll(async () => {
    const owner = await registerUser({ role: 'owner', email: 'owner-res@test.com' });
    ownerToken = owner.token;
    const client = await registerUser({ role: 'client', email: 'client-res@test.com' });
    clientToken = client.token;
    const otherClient = await registerUser({ role: 'client', email: 'client-res2@test.com' });
    otherClientToken = otherClient.token;

    const venueRes = await request(app)
      .post('/api/venues')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Cancha Reservas', sportType: 'Fútbol', address: 'Calle 2', pricePerHour: 200 });
    venueId = venueRes.body.id;

    await request(app)
      .put(`/api/venues/${venueId}/schedule`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ schedules: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, openTime: '00:00', closeTime: '23:00' })) });
  });

  it('rechaza reservar si el usuario es dueño, no cliente', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ venueId, date: today, startTime: '10:00', endTime: '11:00' });
    expect(res.status).toBe(403);
  });

  it('rechaza reservar con campos faltantes', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ venueId, date: today });
    expect(res.status).toBe(400);
  });

  it('rechaza reservar una cancha inexistente', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ venueId: 999999, date: today, startTime: '10:00', endTime: '11:00' });
    expect(res.status).toBe(404);
  });

  it('crea una reserva válida y calcula el precio total', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ venueId, date: today, startTime: '10:00', endTime: '11:00' });
    expect(res.status).toBe(201);
    expect(res.body.totalPrice).toBe('200.00');
    reservationId = res.body.id;
  });

  it('rechaza una segunda reserva que se solapa con la existente', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${otherClientToken}`)
      .send({ venueId, date: today, startTime: '10:30', endTime: '11:30' });
    expect(res.status).toBe(409);
  });

  it('permite reservar un horario adyacente que NO se solapa', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${otherClientToken}`)
      .send({ venueId, date: today, startTime: '11:00', endTime: '12:00' });
    expect(res.status).toBe(201);
  });

  it('rechaza que alguien que no es el dueño confirme la reserva', async () => {
    const res = await request(app)
      .patch(`/api/reservations/${reservationId}/confirm`)
      .set('Authorization', `Bearer ${otherClientToken}`);
    expect(res.status).toBe(403);
  });

  it('rechaza que un usuario ajeno cancele la reserva de otro', async () => {
    const res = await request(app)
      .patch(`/api/reservations/${reservationId}/cancel`)
      .set('Authorization', `Bearer ${otherClientToken}`);
    expect(res.status).toBe(403);
  });

  it('permite al dueño confirmar la reserva', async () => {
    const res = await request(app)
      .patch(`/api/reservations/${reservationId}/confirm`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
  });

  it('rechaza que un cliente vea las reservas de una cancha que no es suya', async () => {
    const res = await request(app)
      .get(`/api/reservations/venue/${venueId}`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(403);
  });

  it('permite al cliente cancelar su propia reserva confirmada', async () => {
    const res = await request(app)
      .patch(`/api/reservations/${reservationId}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('permite reservar el mismo horario después de que la reserva original fue cancelada', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${otherClientToken}`)
      .send({ venueId, date: today, startTime: '10:00', endTime: '11:00' });
    expect(res.status).toBe(201);
  });
});

describe('Reviews', () => {
  let ownerToken, clientToken, venueId;
  const today = new Date().toISOString().slice(0, 10);

  beforeAll(async () => {
    const owner = await registerUser({ role: 'owner', email: 'owner-rev@test.com' });
    ownerToken = owner.token;
    const client = await registerUser({ role: 'client', email: 'client-rev@test.com' });
    clientToken = client.token;

    const venueRes = await request(app)
      .post('/api/venues')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Cancha Reseñas', sportType: 'Tenis', address: 'Calle 3', pricePerHour: 300 });
    venueId = venueRes.body.id;
  });

  it('rechaza reseñar una cancha sin tener una reserva confirmada', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ venueId, rating: 5, comment: 'Intento sin reserva' });
    expect(res.status).toBe(403);
  });

  it('permite reseñar tras tener una reserva confirmada', async () => {
    await request(app)
      .put(`/api/venues/${venueId}/schedule`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ schedules: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, openTime: '00:00', closeTime: '23:00' })) });

    const reservationRes = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ venueId, date: today, startTime: '09:00', endTime: '10:00' });

    await request(app)
      .patch(`/api/reservations/${reservationRes.body.id}/confirm`)
      .set('Authorization', `Bearer ${ownerToken}`);

    const reviewRes = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ venueId, rating: 5, comment: 'Excelente' });

    expect(reviewRes.status).toBe(201);
    expect(reviewRes.body.venueId).toBe(venueId);
  });

  it('lista las reseñas de una cancha', async () => {
    const res = await request(app).get(`/api/reviews/venue/${venueId}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('el promedio de calificación de la cancha refleja la reseña creada', async () => {
    const res = await request(app).get(`/api/venues/${venueId}`);
    expect(res.body.avgRating).toBe(5);
    expect(res.body.reviewCount).toBe(1);
  });
});

describe('Notifications', () => {
  it('genera una notificación para el dueño cuando se crea una reserva', async () => {
    const owner = await registerUser({ role: 'owner', email: 'owner-notif@test.com' });
    const client = await registerUser({ role: 'client', email: 'client-notif@test.com' });

    const venueRes = await request(app)
      .post('/api/venues')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Cancha Notif', sportType: 'Baloncesto', address: 'Calle 4', pricePerHour: 150 });

    await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${client.token}`)
      .send({ venueId: venueRes.body.id, date: new Date().toISOString().slice(0, 10), startTime: '08:00', endTime: '09:00' });

    const notifRes = await request(app)
      .get('/api/notifications/me')
      .set('Authorization', `Bearer ${owner.token}`);

    expect(notifRes.status).toBe(200);
    expect(notifRes.body.some((n) => n.type === 'reservation_created')).toBe(true);
  });

  it('rechaza marcar como leída una notificación de otro usuario', async () => {
    const owner = await registerUser({ role: 'owner', email: 'owner-notif2@test.com' });
    const intruder = await registerUser({ role: 'client', email: 'intruder@test.com' });

    const venueRes = await request(app)
      .post('/api/venues')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Cancha Notif 2', sportType: 'Vóleibol', address: 'Calle 5', pricePerHour: 150 });

    await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${intruder.token}`)
      .send({ venueId: venueRes.body.id, date: new Date().toISOString().slice(0, 10), startTime: '08:00', endTime: '09:00' });

    const notifRes = await request(app)
      .get('/api/notifications/me')
      .set('Authorization', `Bearer ${owner.token}`);
    const notifId = notifRes.body[0]._id;

    const res = await request(app)
      .patch(`/api/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${intruder.token}`);
    expect(res.status).toBe(404);
  });
});
