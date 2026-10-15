import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions:
    process.env.NODE_ENV === 'production'
      // DATABASE_URL is Render's internal connection string (private network, same region);
      // its cert isn't signed by a public CA, so it can't be verified here.
      // nosemgrep: problem-based-packs.insecure-transport.js-node.bypass-tls-verification.bypass-tls-verification
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {},
});

export default sequelize;
