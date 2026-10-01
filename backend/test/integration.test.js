import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { sequelize, Reservation } from '../src/models/sql/index.js';
import { nowIn, VENUE_TZ } from '../src/utils/availability.js';
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

// Fechas relativas a "hoy" en Santo Domingo: reservar hoy a una hora que ya pasó se rechaza,
// así que las pruebas usan mañana, y las reseñas necesitan una reserva de ayer.
function dayOffset(n) {
  const d = new Date(`${nowIn(VENUE_TZ).date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const TOMORROW = dayOffset(1);
const YESTERDAY = dayOffset(-1);
const ALL_WEEK = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, openTime: '00:00', closeTime: '23:00' }));

async function openAllWeek(token, venueId) {
  await request(app).put(`/api/venues/${venueId}/schedule`).set('Authorization', `Bearer ${token}`).send({ schedules: ALL_WEEK });
}

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

  it('trata el email sin distinguir mayúsculas al registrarse y al iniciar sesión', async () => {
    const reg = await request(app).post('/api/auth/register')
      .send({ name: 'Ana', email: 'Ana.Caps@Test.com', password: 'password123', role: 'client' });
    expect(reg.status).toBe(201);
    expect(reg.body.user.email).toBe('ana.caps@test.com');

    const dup = await request(app).post('/api/auth/register')
      .send({ name: 'Ana 2', email: 'ana.caps@test.com', password: 'password123', role: 'client' });
    expect(dup.status).toBe(409);

    const login = await request(app).post('/api/auth/login').send({ email: 'ANA.CAPS@test.com', password: 'password123' });
    expect(login.status).toBe(200);
  });

  it('no filtra el mensaje interno de un error 500', async () => {
    const res = await request(app).get('/api/venues/no-es-un-id');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Error interno del servidor');
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

  it('rechaza un horario con un día inválido sin borrar el que ya estaba', async () => {
    const res = await request(app)
      .put(`/api/venues/${venueId}/schedule`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ schedules: [{ dayOfWeek: 1, openTime: '08:00', closeTime: '12:00' }, { dayOfWeek: 7, openTime: '08:00', closeTime: '12:00' }] });
    expect(res.status).toBe(400);

    const venue = await request(app).get(`/api/venues/${venueId}`);
    expect(venue.body.schedules).toHaveLength(1);
  });

  it('rechaza un horario que cierra antes de abrir o con horas mal formadas', async () => {
    for (const entry of [{ dayOfWeek: 1, openTime: '22:00', closeTime: '08:00' }, { dayOfWeek: 1, openTime: 'abc', closeTime: '12:00' }]) {
      const res = await request(app)
        .put(`/api/venues/${venueId}/schedule`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ schedules: [entry] });
      expect(res.status).toBe(400);
    }
  });

  // El panel del dueño edita el horario desde esta lista: sin los horarios, el editor
  // abría vacío y al guardar borraba los días ya configurados.
  it('la lista de canchas incluye el horario de cada una', async () => {
    const res = await request(app).get('/api/venues');
    const venue = res.body.find((v) => v.id === venueId);
    expect(venue.schedules).toHaveLength(1);
  });

  it('permite crear una cancha con precio 0', async () => {
    const res = await request(app)
      .post('/api/venues')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Cancha Gratis', sportType: 'Fútbol', address: 'Parque', pricePerHour: 0 });
    expect(res.status).toBe(201);
  });

  it('exporta venueId para las pruebas de reservas', () => {
    expect(venueId).toBeTruthy();
  });
});

describe('Reservations', () => {
  let ownerToken, clientToken, otherClientToken, venueId, reservationId;
  const today = TOMORROW;

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
      .send({ venueId, date: today, startTime: '10:00', endTime: '12:00' });
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

  it('el dueño ve quién hizo cada reserva, sin datos sensibles', async () => {
    const res = await request(app)
      .get(`/api/reservations/venue/${venueId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body[0].user).toMatchObject({ name: expect.any(String), email: expect.any(String) });
    expect(res.body[0].user.passwordHash).toBeUndefined();
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

  // Antes un dueño con el panel abierto podía "confirmar" una reserva ya cancelada
  // cuyo horario otra persona había vuelto a tomar: doble reserva.
  it('no deja confirmar una reserva cancelada', async () => {
    const res = await request(app)
      .patch(`/api/reservations/${reservationId}/confirm`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(409);
  });

  it('no deja cancelar dos veces la misma reserva', async () => {
    const res = await request(app)
      .patch(`/api/reservations/${reservationId}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(409);
  });

  it('rechaza horas al revés y de duración cero (antes daban precio negativo o gratis)', async () => {
    for (const [startTime, endTime] of [['20:00', '18:00'], ['14:00', '14:00']]) {
      const res = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ venueId, date: today, startTime, endTime });
      expect(res.status).toBe(400);
    }
  });

  it('rechaza bloques fuera de la grilla de 1 hora y horas inexistentes', async () => {
    for (const [startTime, endTime] of [['14:30', '15:30'], ['99:00', '99:59']]) {
      const res = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ venueId, date: today, startTime, endTime });
      expect(res.status).toBe(400);
    }
  });

  it('rechaza reservar en el pasado y fechas imposibles (antes 2026-02-30 daba 500)', async () => {
    for (const date of [YESTERDAY, '2026-02-30']) {
      const res = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ venueId, date, startTime: '14:00', endTime: '15:00' });
      expect(res.status).toBe(400);
    }
  });

  it('rechaza reservar fuera del horario de la cancha o un día que no abre', async () => {
    const venueRes = await request(app)
      .post('/api/venues')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Cancha Horario Corto', sportType: 'Fútbol', address: 'Calle 9', pricePerHour: 100 });
    const tomorrowDow = new Date(`${today}T00:00:00Z`).getUTCDay();
    await request(app)
      .put(`/api/venues/${venueRes.body.id}/schedule`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ schedules: [{ dayOfWeek: tomorrowDow, openTime: '08:00', closeTime: '22:00' }] });

    const outside = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ venueId: venueRes.body.id, date: today, startTime: '06:00', endTime: '07:00' });
    expect(outside.status).toBe(400);

    const closedDay = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ venueId: venueRes.body.id, date: dayOffset(2), startTime: '10:00', endTime: '11:00' });
    expect(closedDay.status).toBe(400);
  });

  it('no deja borrar una cancha con reservas por venir', async () => {
    const res = await request(app)
      .delete(`/api/venues/${venueId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(409);
  });

  it('marca como no disponibles los bloques de hoy que ya empezaron', async () => {
    const res = await request(app).get(`/api/venues/${venueId}/availability?date=${dayOffset(0)}`);
    expect(res.status).toBe(200);
    const now = nowIn(VENUE_TZ);
    for (const slot of res.body.slots) {
      const [h, m] = slot.startTime.split(':').map(Number);
      if (h * 60 + m <= now.minutes) expect(slot.available).toBe(false);
    }
  });
});

describe('Reviews', () => {
  let ownerToken, clientToken, venueId;
  const today = TOMORROW;

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

    // confirmada pero todavía no jugada: no alcanza para reseñar
    const tooEarly = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ venueId, rating: 5, comment: 'Excelente' });
    expect(tooEarly.status).toBe(403);

    // la API no deja crear reservas en el pasado, así que se simula que ya se jugó
    await Reservation.update({ date: YESTERDAY }, { where: { id: reservationRes.body.id } });

    const reviewRes = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ venueId, rating: 5, comment: 'Excelente' });

    expect(reviewRes.status).toBe(201);
    expect(reviewRes.body.venueId).toBe(venueId);
  });

  it('rechaza una segunda reseña del mismo cliente para la misma cancha', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ venueId, rating: 1, comment: 'Otra más para bajar el promedio' });
    expect(res.status).toBe(409);
  });

  it('rechaza una calificación que no es un entero del 1 al 5', async () => {
    for (const rating of [4.7, 0, 6, '5']) {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ venueId, rating });
      expect(res.status).toBe(400);
    }
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
    await openAllWeek(owner.token, venueRes.body.id);

    await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${client.token}`)
      .send({ venueId: venueRes.body.id, date: TOMORROW, startTime: '08:00', endTime: '09:00' });

    const notifRes = await request(app)
      .get('/api/notifications/me')
      .set('Authorization', `Bearer ${owner.token}`);

    expect(notifRes.status).toBe(200);
    expect(notifRes.body.some((n) => n.type === 'reservation_created')).toBe(true);
  });

  // Antes, si Mongo fallaba después del commit, el rollback sobre una transacción ya
  // terminada tiraba otra excepción: la request quedaba colgada (o se caía el proceso)
  // aunque la reserva sí se había guardado, y el reintento del cliente daba 409.
  it('responde 201 aunque falle la notificación, porque la reserva ya quedó guardada', async () => {
    const owner = await registerUser({ role: 'owner', email: 'owner-notif3@test.com' });
    const client = await registerUser({ role: 'client', email: 'client-notif3@test.com' });
    const venueRes = await request(app)
      .post('/api/venues')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Cancha Mongo Caído', sportType: 'Fútbol', address: 'Calle 6', pricePerHour: 150 });
    await openAllWeek(owner.token, venueRes.body.id);

    const spy = vi.spyOn(Notification, 'create').mockRejectedValueOnce(new Error('mongo down'));
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${client.token}`)
      .send({ venueId: venueRes.body.id, date: TOMORROW, startTime: '15:00', endTime: '16:00' });
    spy.mockRestore();

    expect(res.status).toBe(201);
  });

  it('rechaza marcar como leída una notificación de otro usuario', async () => {
    const owner = await registerUser({ role: 'owner', email: 'owner-notif2@test.com' });
    const intruder = await registerUser({ role: 'client', email: 'intruder@test.com' });

    const venueRes = await request(app)
      .post('/api/venues')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Cancha Notif 2', sportType: 'Vóleibol', address: 'Calle 5', pricePerHour: 150 });
    await openAllWeek(owner.token, venueRes.body.id);

    await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${intruder.token}`)
      .send({ venueId: venueRes.body.id, date: TOMORROW, startTime: '08:00', endTime: '09:00' });

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
