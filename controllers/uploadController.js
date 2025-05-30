import fs from 'fs';
import path from 'path';
import { User } from '../models/User.js';
import { exec } from 'child_process';
import util from 'util';
const execAsync = util.promisify(exec);

export const processUploadedFile = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const email = user.email;
    const linuxUsername = email.split('@')[0].replace(/\W/g, '_');

    const tempPath = req.file.path;
    const originalName = req.file.originalname;
    const dataDir = path.resolve(`/home/${linuxUsername}/data`);
    const finalPath = path.join(dataDir, originalName);

    // 🪵 ДО ЛЮБОЙ ФАЙЛОВОЙ ОПЕРАЦИИ — лог
    console.log('==== PRE-RENAME LOG ====');
    console.log('User ID:', userId);
    console.log('Email:', email);
    console.log('Linux Username:', linuxUsername);
    console.log('Temp uploaded path:', tempPath);
    console.log('Original filename:', originalName);
    console.log('Final dataDir:', dataDir);
    console.log('Final move target:', finalPath);
    console.log('========================');

    // 🔒 Убедимся, что директория существует
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Переместить файл
    fs.renameSync(tempPath, finalPath);

    const resultsPath = path.resolve(`/home/${linuxUsername}/results`);
    const scriptPath = path.resolve(`/home/vboxuser/start.sh`);

    const cmd = `bash "${scriptPath}" "${finalPath}" "${resultsPath}"`;
    const { stdout, stderr } = await execAsync(cmd);

    const match = stdout.match(/Result saved to:\s*(.*output_\d+\.root)/);
    const outputFilePath = match ? match[1] : null;

    // 🪵 После выполнения
    console.log('==== File Processing Log ====');
    console.log('Command executed:', cmd);
    console.log('STDOUT:\n', stdout);
    console.log('STDERR:\n', stderr);
    console.log('Output file:', outputFilePath || 'NOT FOUND');
    console.log('=============================');

    if (!outputFilePath || !fs.existsSync(outputFilePath)) {
      return res.status(500).json({ message: 'Output file not found' });
    }

    return res.download(outputFilePath);

  } catch (error) {
    console.error('=== FATAL ERROR ===');
    console.error(error.stack || error.message);
    return res.status(500).json({ message: 'Error processing file' });
  }
};
