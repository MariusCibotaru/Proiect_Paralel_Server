import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import uploadRoutes from './routes/uploadRoutes.js'
import { connectToDB } from './config/db.js';


dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);

app.use(express.json());

app.use('/api/auth', authRoutes);

app.use('/api/file', uploadRoutes);


app.get('/', (req, res) => {
  res.send('server ok');
});

// Старт сервера после подключения к БД
const PORT = Number(process.env.PORT) || 8000;

const startServer = async () => {
  await connectToDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (${process.env.NODE_ENV})`);
  });
};

startServer();
