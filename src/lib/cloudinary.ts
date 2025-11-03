

export const uploadToCloudinary = async (file: File): Promise<string> => {
  // Prefer VITE_ prefixed envs (exposed to client by Vite) but fall back to non-prefixed
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? import.meta.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? import.meta.env.CLOUDINARY_UPLOAD_PRESET;

  console.debug('Cloudinary envs:', { cloudName: !!cloudName, uploadPreset: !!uploadPreset });

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Cloudinary configuration missing. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to .env (then restart dev server).'
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Cloudinary upload failed: ${response.status} ${response.statusText} ${text}`);
    }

  const data = await response.json();
  if (!data || !data.secure_url) throw new Error('Cloudinary returned unexpected response');
  // Return full response data (includes public_id, format, secure_url, bytes, etc.)
  return data as any;
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('uploadToCloudinary error:', err);
    throw err;
  }
};

