import multer from 'multer';
import { Storage } from '@google-cloud/storage';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Google Cloud Storage Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = new Storage({
  keyFilename: path.join(__dirname, '..', 'gcs-credentials.json'),
  projectId: 'alpine-aspect-459412-p7', // Replace with your Google Cloud Project ID
});

const bucketName = 'healthcare-app-report'; // Replace with your GCS bucket name
const bucket = storage.bucket(bucketName);

// --- Multer Configuration ---
// We use memoryStorage to temporarily hold the file before uploading to GCS
const multerStorage = multer.memoryStorage();

const multerUpload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/**
 * Middleware to upload a file to Google Cloud Storage.
 * This should be placed after multerUpload.single('fieldname').
 */
const uploadToGCS = (req, res, next) => {
  if (!req.file) {
    return next(); // If no file, skip to the next middleware
  }

  const gcsFileName = `${Date.now()}-${req.file.originalname}`;
  const file = bucket.file(gcsFileName);

  const stream = file.createWriteStream({
    metadata: {
      contentType: req.file.mimetype,
    },
    resumable: false,
  });

  stream.on('error', (err) => {
    req.file.cloudStorageError = err;
    next(err);
  });

  stream.on('finish', () => {
    // Make the file public and get its URL
    file.makePublic().then(() => {
      req.file.gcsUrl = `https://storage.googleapis.com/${bucketName}/${gcsFileName}`;
      next();
    });
  });

  stream.end(req.file.buffer);
};

export { multerUpload, uploadToGCS };