import multer from 'multer';

// Keep files in memory; we stream the buffer straight to Cloudinary / xlsx.
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});
