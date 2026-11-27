import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { storage } from './firebase';

export type StorageFolder = 'logo' | 'menu' | 'bbq' | 'banners' | 'offers' | 'gallery';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export async function uploadRestaurantImage(
  file: File,
  folder: StorageFolder,
  onProgress?: (pct: number) => void
): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Please upload a JPG, PNG, WebP, or AVIF image.');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Image size must be 5 MB or less.');
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const objectPath = `restaurant/${folder}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, objectPath);

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      cacheControl: 'public,max-age=86400',
    });

    task.on(
      'state_changed',
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
        }
      },
      (error) => reject(error),
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

export async function deleteStorageImageByUrl(url?: string): Promise<void> {
  if (!url) return;
  if (!url.includes('firebasestorage.googleapis.com') && !url.includes('firebasestorage.app')) {
    return;
  }
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch (err) {
    console.warn('Could not delete previous storage image:', err);
  }
}
