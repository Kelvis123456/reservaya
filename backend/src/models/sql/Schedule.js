import { DataTypes } from 'sequelize';
import sequelize from '../../config/postgres.js';

// dayOfWeek: 0 = domingo ... 6 = sabado
const Schedule = sequelize.define('Schedule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  dayOfWeek: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 0, max: 6 },
  },
  openTime: {
    type: DataTypes.STRING, // 'HH:mm'
    allowNull: false,
  },
  closeTime: {
    type: DataTypes.STRING, // 'HH:mm'
    allowNull: false,
  },
}, {
  tableName: 'schedules',
  timestamps: false,
});

export default Schedule;
