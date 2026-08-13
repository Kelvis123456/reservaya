import { DataTypes } from 'sequelize';
import sequelize from '../../config/postgres.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('client', 'owner'),
    allowNull: false,
    defaultValue: 'client',
  },
}, {
  tableName: 'users',
  timestamps: true,
});

export default User;
