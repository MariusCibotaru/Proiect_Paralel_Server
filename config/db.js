import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: envFile });

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,
  }
);

const connectToDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Соединение с базой данных установлено успешно.');
    
    // Синхронизируем модели с базой данных
    await sequelize.sync({ alter: true });
    
    console.log('Модели синхронизированы с базой данных.');
  } catch (error) {
    console.error('Ошибка соединения с базой данных:', error);
  }
};

// Экспортируем sequelize и функцию подключения
export { sequelize, connectToDB };
