import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `events/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('event-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      toast.error('Ошибка загрузки изображения');
      console.error('Upload error:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (url: string): Promise<boolean> => {
    try {
      // Extract the file path from the URL
      const urlParts = url.split('/event-images/');
      if (urlParts.length < 2) return false;
      
      const filePath = urlParts[1];
      
      const { error } = await supabase.storage
        .from('event-images')
        .remove([filePath]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  };

  return { uploadImage, deleteImage, uploading };
}
