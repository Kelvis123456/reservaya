import sequelize from '../../config/postgres.js';
import User from './User.js';
import Venue from './Venue.js';
import Schedule from './Schedule.js';
import Reservation from './Reservation.js';

// Un dueño (User) tiene muchas canchas (Venue)
User.hasMany(Venue, { foreignKey: 'ownerId', as: 'venues' });
Venue.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// Una cancha tiene muchos horarios semanales
Venue.hasMany(Schedule, { foreignKey: 'venueId', as: 'schedules', onDelete: 'CASCADE' });
Schedule.belongsTo(Venue, { foreignKey: 'venueId' });

// Una cancha tiene muchas reservas
Venue.hasMany(Reservation, { foreignKey: 'venueId', as: 'reservations', onDelete: 'CASCADE' });
Reservation.belongsTo(Venue, { foreignKey: 'venueId', as: 'venue' });

// Un usuario (cliente) tiene muchas reservas
User.hasMany(Reservation, { foreignKey: 'userId', as: 'reservations' });
Reservation.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export { sequelize, User, Venue, Schedule, Reservation };
