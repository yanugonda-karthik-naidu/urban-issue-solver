

export const uploadToCloudinary = async (file: File): Promise<string> => {
  // Prefer VITE_ prefixed envs (exposed by Vite). Fall back to legacy/non-prefixed envs if present.
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || import.meta.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || import.meta.env.CLOUDINARY_UPLOAD_PRESET;

  try {
    // eslint-disable-next-line no-console
    console.log('[cloudinary] VITE_CLOUDINARY_CLOUD_NAME=', import.meta.env.VITE_CLOUDINARY_CLOUD_NAME, 'VITE_CLOUDINARY_UPLOAD_PRESET=', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
    // eslint-disable-next-line no-console
    console.log('[cloudinary] CLOUDINARY_CLOUD_NAME=', import.meta.env.CLOUDINARY_CLOUD_NAME, 'CLOUDINARY_UPLOAD_PRESET=', import.meta.env.CLOUDINARY_UPLOAD_PRESET);
  } catch (e) {
    // ignore in non-browser contexts
  }

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary configuration missing. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env (or set CLOUDINARY_CLOUD_NAME/CLOUDINARY_UPLOAD_PRESET for non-Vite environments)');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error('Failed to upload image to Cloudinary');
  }

  const data = await response.json();
  return data.secure_url;
};

