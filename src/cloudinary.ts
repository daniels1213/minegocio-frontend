type ImageKind = 'profile' | 'catalog' | 'product'

const env = import.meta.env

const imageConfig: Record<ImageKind, { cloudName?: string; uploadPreset?: string }> = {
  profile: {
    cloudName: env.VITE_CLOUDINARY_PROFILE_CLOUD_NAME || env.VITE_CLOUDINARY_CLOUD_NAME,
    uploadPreset: env.VITE_CLOUDINARY_PROFILE_UPLOAD_PRESET,
  },
  catalog: {
    cloudName: env.VITE_CLOUDINARY_CATALOG_CLOUD_NAME || env.VITE_CLOUDINARY_CLOUD_NAME,
    uploadPreset: env.VITE_CLOUDINARY_CATALOG_UPLOAD_PRESET || env.VITE_CLOUDINARY_UPLOAD_PRESET,
  },
  product: {
    cloudName: env.VITE_CLOUDINARY_PRODUCT_CLOUD_NAME || env.VITE_CLOUDINARY_CLOUD_NAME,
    uploadPreset: env.VITE_CLOUDINARY_PRODUCT_UPLOAD_PRESET,
  },
}

export async function uploadCloudinaryImage(file: File, kind: ImageKind): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecciona un archivo de imagen válido.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('La imagen no puede superar los 5 MB.')
  }

  const { cloudName, uploadPreset } = imageConfig[kind]
  const labels: Record<ImageKind, string> = {
    profile: 'fotos de perfil',
    catalog: 'portadas de catálogo',
    product: 'fotos de productos',
  }
  if (!cloudName || !uploadPreset) {
    throw new Error(`Falta configurar Cloudinary para ${labels[kind]}.`)
  }

  const body = new FormData()
  body.append('file', file)
  body.append('upload_preset', uploadPreset)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body,
  })
  const result = await response.json() as { secure_url?: string; error?: { message?: string } }
  if (!response.ok || !result.secure_url) {
    throw new Error(result.error?.message || 'No se pudo subir la imagen.')
  }

  return result.secure_url
}