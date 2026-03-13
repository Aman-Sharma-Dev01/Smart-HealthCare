import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- Multer Configuration ---
// Keep uploads in memory before streaming to Cloudinary
const multerStorage = multer.memoryStorage();

const multerUpload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/**
 * Middleware to upload a file to Cloudinary.
 * This should be placed after multerUpload.single('fieldname').
 */
const uploadToCloudinary = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    req.file.cloudinaryError = new Error('Cloudinary environment variables are missing.');
    req.file.cloudStorageError = req.file.cloudinaryError;
    return next();
  }

  const folder = process.env.CLOUDINARY_FOLDER || 'patient-vault';

  const uploadStream = cloudinary.uploader.upload_stream(
    {
      folder,
      resource_type: 'auto',
      public_id: `${Date.now()}-${req.file.originalname.replace(/\s+/g, '-')}`,
      use_filename: false,
      unique_filename: true,
      overwrite: false,
    },
    (error, result) => {
      if (error) {
        req.file.cloudinaryError = error;
        req.file.cloudStorageError = error;
        return next();
      }

      req.file.cloudinaryUrl = result?.secure_url;
      req.file.cloudinaryPublicId = result?.public_id;
      req.file.gcsUrl = result?.secure_url;
      return next();
    }
  );

    uploadStream.end(req.file.buffer);
};

  const uploadToGCS = uploadToCloudinary;

  export { multerUpload, uploadToCloudinary, uploadToGCS };