import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  dbPath: process.env.DB_PATH || './database/coffeepos.db',
  jwtSecret: process.env.JWT_SECRET || 'default_secret_change_in_production',
  ivaRate: parseFloat(process.env.IVA_RATE) || 0.16
};
