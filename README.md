# ReservaYa

Plataforma de reservas de canchas deportivas (fútbol, baloncesto, tenis, etc.). Los usuarios exploran canchas, ven su disponibilidad en tiempo real y reservan un horario; los dueños publican sus canchas, configuran horarios y gestionan reservas.

Proyecto académico que demuestra una **arquitectura híbrida de bases de datos**: PostgreSQL (SQL) y MongoDB (NoSQL) conviviendo en el mismo backend, cada una usada para el tipo de dato al que mejor se ajusta.

## ¿Por qué dos motores de base de datos?

| PostgreSQL (relacional) | MongoDB (documentos) |
|---|---|
| `users` — cuentas de clientes y dueños | `reviews` — reseñas de canchas |
| `venues` — canchas publicadas | `notifications` — notificaciones de eventos |
| `schedules` — horario semanal de cada cancha | |
| `reservations` — reservas de horarios | |

**PostgreSQL** se usa para los datos con relaciones estrictas e integridad referencial: una reserva pertenece a un usuario y a una cancha, no puede haber dos reservas que se solapen, un horario pertenece a una cancha. Estas reglas se apoyan en llaves foráneas, transacciones y bloqueos de fila (evitar dobles reservas al reservar).

**MongoDB** se usa para datos flexibles y de alto volumen de escritura que no necesitan una relación estricta: una reseña puede traer distintos campos según el caso (tags, respuesta del dueño, fotos a futuro) y las notificaciones tienen una forma distinta según el tipo de evento (`metadata` es de esquema libre). Ninguna de las dos colecciones necesita transacciones multi-tabla ni joins con otras tablas.

## Stack

- **Backend:** Node.js + Express, Sequelize (PostgreSQL) y Mongoose (MongoDB), autenticación JWT.
- **Frontend:** React + Vite + Tailwind CSS, React Router, Axios.
- **Infraestructura:** Docker Compose para levantar PostgreSQL y MongoDB localmente.

## Estructura del proyecto

```
ReservaYa/
├── backend/         # API REST (Express + Sequelize + Mongoose)
│   └── src/
│       ├── models/sql/     # User, Venue, Schedule, Reservation (PostgreSQL)
│       ├── models/nosql/   # Review, Notification (MongoDB)
│       ├── controllers/
│       ├── routes/
│       └── seed.js         # Datos de ejemplo
├── frontend/         # SPA en React
│   └── src/
│       ├── pages/
│       ├── components/
│       └── context/        # Auth y notificaciones (toasts)
└── docker-compose.yml       # PostgreSQL + MongoDB
```

## Cómo ejecutarlo localmente

### 1. Levantar las bases de datos

```bash
docker compose up -d
```

Esto levanta PostgreSQL en `localhost:5433` y MongoDB en `localhost:27017`.

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run seed   # crea usuarios, canchas y datos de ejemplo
npm run dev    # http://localhost:4000
```

Credenciales de prueba creadas por el seed:

- Dueño: `owner@reservaya.com` / `password123`
- Cliente: `client@reservaya.com` / `password123`

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev    # http://localhost:5173
```

## Flujo principal

1. Un **dueño** se registra, publica una cancha y define su horario semanal.
2. Un **cliente** explora canchas, filtra por deporte, ve la disponibilidad de horarios de un día específico y reserva un slot libre.
3. El backend valida en una transacción de PostgreSQL que el horario no se solape con otra reserva activa antes de confirmarla.
4. Al crear/confirmar/cancelar una reserva se genera una notificación en MongoDB para la otra parte.
5. Tras una reserva confirmada, el cliente puede dejar una reseña (MongoDB) que se agrega al promedio de calificación de la cancha.

## Pruebas automatizadas

```bash
# Backend (requiere una base de datos de prueba, ver backend/.env.test)
cd backend
npm test        # 12 unit tests + 35 tests de integración (Vitest + Supertest)

# Frontend
cd frontend
npm test        # 19 tests de componentes (Vitest + React Testing Library)
```

Las pruebas de integración corren contra una base de datos Postgres/Mongo real (no mocks) y están pensadas para cubrir sobre todo los casos negativos: credenciales inválidas, roles sin permiso, recursos de otro usuario, reservas solapadas, etc. — no solo el camino feliz.

## Despliegue en Render

El repo trae un `render.yaml` (Blueprint) que crea tres recursos: la API (`reservaya-api`), la base de datos PostgreSQL administrada (`reservaya-db`) y el sitio estático del frontend (`reservaya-frontend`).

1. En el dashboard de Render: **New > Blueprint**, apunta al repo y aplica.
2. MongoDB no tiene servicio administrado en Render — crea un cluster gratuito en [MongoDB Atlas](https://www.mongodb.com/atlas) y pega su connection string en la variable `MONGO_URL` del servicio `reservaya-api` (queda vacía por defecto, hay que completarla a mano en el dashboard).
3. `CORS_ORIGIN` y `VITE_API_URL` ya vienen apuntando a las URLs por defecto de Render (`reservaya-api.onrender.com` / `reservaya-frontend.onrender.com`); si usas otro nombre de servicio o un dominio propio, actualízalas.
4. El frontend es una SPA con React Router (rutas como `/iniciar-sesion`, `/canchas/:id`) — el `render.yaml` incluye una regla de rewrite (`/* -> /index.html`) para que esas rutas no den 404 al recargar o entrar por link directo.
5. Corre `npm run seed --prefix backend` (con `DATABASE_URL` apuntando a la base de Render) si quieres los usuarios de prueba en producción.

## API (resumen)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` / `/api/auth/login` | Registro e inicio de sesión |
| GET | `/api/venues` | Listar canchas (filtros: `sportType`, `search`) |
| GET | `/api/venues/:id/availability?date=` | Slots disponibles de un día |
| POST | `/api/reservations` | Crear reserva (valida solapamiento) |
| GET | `/api/reservations/me` | Reservas del usuario autenticado |
| PATCH | `/api/reservations/:id/confirm` \| `/cancel` | Confirmar/cancelar reserva |
| POST | `/api/reviews` | Dejar reseña (requiere reserva confirmada) |
| GET | `/api/notifications/me` | Notificaciones del usuario |
