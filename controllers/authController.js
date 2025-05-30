import { exec } from 'child_process';
import util from 'util';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

const execAsync = util.promisify(exec);

export const registerUser = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  console.log('req.body', req.body)

  try {
    // Проверка на существующего пользователя в базе
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Хеш пароля
    const saltRounds = Number(process.env.SALT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Создание в MySQL
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      passwordHash,
    });

    // Создание системного пользователя в Linux
    const linuxUsername = email; // или использовать отдельное поле
    const { stdout } = await execAsync(`id -u ${linuxUsername}`).catch(() => ({ stdout: null }));
    if (stdout) {
      return res.status(400).json({ message: 'Linux user already exists' });
    }

    await execAsync(`sudo useradd -m -s /bin/bash ${linuxUsername}`);
    await execAsync(`echo "${linuxUsername}:${password}" | sudo chpasswd`);

    return res.status(201).json({
      message: 'User created successfully',
      user: {
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error during registration' });
  }
};
