const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Delete an image from Cloudinary by its public_id.
 * Safe to call even if the key is a Drive file ID — will just fail silently.
 */
async function deleteFromCloudinary(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn('[cloudinary delete]', publicId, err.message);
  }
}

module.exports = { deleteFromCloudinary };
