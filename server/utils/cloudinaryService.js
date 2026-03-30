const cloudinary = require('cloudinary').v2;

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = process.env;

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const ensureConfigured = () => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error('Server configuration error: Cloudinary credentials are missing.');
  }
};

const uploadImageBuffer = (buffer, { folder = 'audibook', originalname, mimetype } = {}) => {
  ensureConfigured();

  if (!buffer) {
    throw new Error('Image buffer is missing.');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        use_filename: true,
        unique_filename: true,
        filename_override: originalname,
        format: mimetype && mimetype.includes('/') ? mimetype.split('/')[1] : undefined,
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Image upload failed on Cloudinary: ${error.message}`));
          return;
        }

        resolve(result.secure_url);
      }
    );

    uploadStream.end(buffer);
  });
};

const extractPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;

  const marker = '/upload/';
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return null;

  let pathPart = url.slice(markerIndex + marker.length);
  pathPart = pathPart.replace(/^v\d+\//, '');

  const lastDot = pathPart.lastIndexOf('.');
  if (lastDot !== -1) {
    pathPart = pathPart.slice(0, lastDot);
  }

  return pathPart || null;
};

const deleteImageByUrl = async (url) => {
  ensureConfigured();

  const publicId = extractPublicIdFromUrl(url);
  if (!publicId) {
    return;
  }

  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
};

module.exports = {
  uploadImageBuffer,
  deleteImageByUrl,
};
