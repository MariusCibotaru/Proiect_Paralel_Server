import { exec } from 'child_process';
import util from 'util';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { sequelize } from '../config/db.js'; 
const execAsync = util.promisify(exec);

export const registerUser = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  const transaction = await sequelize.transaction();

  try {
    // Проверка существования в БД
    const existingUser = await User.findOne({ where: { email }, transaction });
    if (existingUser) {
      await transaction.rollback();
      return res.status(400).json({ message: 'User already exists' });
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

    const linuxUsername = email.split('@')[0].replace(/\W/g, '_');

    // Проверка, существует ли уже Linux-пользователь
    const { stdout } = await execAsync(`id -u ${linuxUsername}`).catch(() => ({ stdout: null }));
    if (stdout) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Linux user already exists' });
    }

    // 👇 ВСЁ НИЖЕ ДОЛЖНО МОЧЬ УПАСТЬ БЕЗ КРАША
    try {
      await execAsync(`sudo /usr/sbin/useradd -m -s /bin/bash ${linuxUsername}`);
      await execAsync(`echo "${linuxUsername}:${password}" | sudo /usr/sbin/chpasswd`);
      await execAsync(`sudo mkdir -p /home/${linuxUsername}/data /home/${linuxUsername}/results`);
      await execAsync(`sudo chown -R vboxuser:vboxuser /home/${linuxUsername}/data /home/${linuxUsername}/results`);
    } catch (sysError) {
      console.error('System command failed:', sysError.message);
      await transaction.rollback();

      // 💣 Дополнительно можно удалить Linux user, если `useradd` успел пройти:
      await execAsync(`sudo /usr/sbin/userdel -r ${linuxUsername}`).catch(() => {});

      return res.status(500).json({ message: 'Linux system error during user creation' });
    }

    await transaction.commit();

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
    await transaction.rollback();
    return res.status(500).json({ message: 'Server error during registration' });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Поиск пользователя
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Проверка пароля
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Генерация токена
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

export const getUserById = async (req, res) => {
  try {
    const userId = req.userId; 

    const user = await User.findByPk(userId, {
      attributes: ['id', 'firstName', 'lastName', 'email'],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching user data' });
  }
};


