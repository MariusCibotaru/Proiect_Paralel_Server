import { exec } from 'child_process';
import util from 'util';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
const execAsync = util.promisify(exec);

export const registerUser = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  try {
    // Проверка в базе
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Хеширование
    const saltRounds = Number(process.env.SALT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Создание в MySQL
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      passwordHash,
    });

    // Безопасное имя для Linux-пользователя
    const linuxUsername = email.split('@')[0].replace(/\W/g, '_');

    // Проверка существования
    const { stdout } = await execAsync(`id -u ${linuxUsername}`).catch(() => ({ stdout: null }));
    if (stdout) {
      return res.status(400).json({ message: 'Linux user already exists' });
    }

    // Создание пользователя в Linux
    await execAsync(`sudo /usr/sbin/useradd -m -s /bin/bash ${linuxUsername}`);
    await execAsync(`echo "${linuxUsername}:${password}" | sudo /usr/sbin/chpasswd`);

    // ➕ Создание папок data и results
    await execAsync(`sudo -u ${linuxUsername} mkdir -p /home/${linuxUsername}/data /home/${linuxUsername}/results`);


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


