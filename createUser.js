import bcrypt from 'bcryptjs';
import { sequelize } from './config/db.js';
import { User } from './models/User.js';

export const createUser = async ({ firstName, lastName, email, password }) => {
  const transaction = await sequelize.transaction();

  try {
    const existingUser = await User.findOne({ where: { email }, transaction });

    if (existingUser) {
      await transaction.rollback();
      return { success: false, message: 'User already exists' };
    }

    const saltRounds = Number(process.env.SALT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = await User.create(
      {
        firstName,
        lastName,
        email,
        passwordHash,
      },
      { transaction }
    );

    await transaction.commit();

    return { success: true, user: newUser };
  } catch (error) {
    await transaction.rollback();
    console.error('User creation failed:', error);
    return { success: false, message: 'Internal server error' };
  }
};

// 📌 Вызов с жёстко заданными данными (для теста)
const run = async () => {
  const result = await createUser({
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: '11111111',
  });

  console.log(result);
  process.exit(); // завершить выполнение
};

run();
