import { DataTypes } from 'sequelize';
import sequelize from '../../config/postgres.js';

const Venue = sequelize.define('Venue', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sportType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  pricePerHour: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  imageUrl: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
}, {
  tableName: 'venues',
  timestamps: true,
});

export default Venue;
