import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { processUploadedFile } from '../controllers/uploadController.js';

const router = express.Router();

// Временная загрузка в /tmp
const upload = multer({ dest: '/tmp' });

router.post(
  '/upload',
  authMiddleware,
  upload.single('dataFile'),
  processUploadedFile
);

export default router;
