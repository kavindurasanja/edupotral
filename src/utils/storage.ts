import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import imageCompression from 'browser-image-compression';
import { supabase } from '../supabase';

export const uploadFileToStorage = async (file: File, path: string): Promise<string> => {
  if (!file) throw new Error("No file provided");
  
  let fileToUpload = file;

  // Compress the file if it's an image
  if (file.type.startsWith('image/')) {
    const options = {
      maxSizeMB: 0.5, // Max 500KB
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    };
    try {
      fileToUpload = await imageCompression(file, options);
    } catch (error) {
      console.error("Image compression failed, uploading original:", error);
    }
  }

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, fileToUpload);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
};

export const uploadReceiptToSupabase = async (file: File, path: string): Promise<string> => {
  if (!file) throw new Error("No file provided");
  if (!supabase) throw new Error("Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.");

  let fileToUpload = file;

  // Compress the file if it's an image
  if (file.type.startsWith('image/')) {
    const options = {
      maxSizeMB: 0.5, // Max 500KB
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    };
    try {
      fileToUpload = await imageCompression(file, options);
    } catch (error) {
      console.error("Image compression failed, uploading original:", error);
    }
  }

  const bucketName = 'receipts';
  const cleanPath = path.replace(/^\//, '');

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(cleanPath, fileToUpload, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.error("Supabase upload error:", error);
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(cleanPath);

  return publicUrlData.publicUrl;
};
