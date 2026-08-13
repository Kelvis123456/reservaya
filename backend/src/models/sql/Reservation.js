import { DataTypes } from 'sequelize';
import sequelize from '../../config/postgres.js';

const Reservation = sequelize.define('Reservation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  startTime: {
    type: DataTypes.STRING, // 'HH:mm'
    allowNull: false,
  },
  endTime: {
    type: DataTypes.STRING, // 'HH:mm'
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
}, {
  tableName: 'reservations',
  timestamps: true,
  indexes: [
    { fields: ['venueId', 'date'] },
  ],
});

export default Reservation;
