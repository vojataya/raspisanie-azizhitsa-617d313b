import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { compressImage, formatBytes } from '@/lib/imageCompression';
import {
  EVENT_IMAGES_BUCKET,
  eventImagePathFromUrl,
  eventImagePublicUrl,
  eventImageUploadOptions,
  newEventImagePath,
} from '@/lib/imageUrl';

function fileExtension(file: File): string {
  if (file.type === 'image/jpeg') return 'jpg';
  const dot = file.name.lastIndexOf('.');
  if (dot > 0) return file.name.slice(dot + 1);
  return file.type.split('/')[1] || 'jpg';
}

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);

      // Сжимаем перед загрузкой: шлюз пропускает не больше 2,5 МБ на запрос.
      let prepared;
      try {
        prepared = await compressImage(file);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Не удалось обработать файл');
        return null;
      }
      if (prepared.changed) {
        toast.success(`Фото сжато: ${formatBytes(prepared.originalBytes)} → ${formatBytes(prepared.finalBytes)}`);
      }

      const upload = prepared.file;
      const filePath = newEventImagePath(fileExtension(upload));

      const { error: uploadError } = await supabase.storage
        .from(EVENT_IMAGES_BUCKET)
        .upload(filePath, upload, eventImageUploadOptions(upload.type));

      if (uploadError) throw uploadError;

      // В базу кладём канонический адрес (supabase.co), а не getPublicUrl():
      // в проде клиент ходит через /sb текущего хостинга, и адрес привязался бы к домену.
      return eventImagePublicUrl(filePath);
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
      // Путь файла после /event-images/ — одинаково для адресов supabase.co и <хостинг>/sb
      const filePath = eventImagePathFromUrl(url);
      if (!filePath) return false;

      const { error } = await supabase.storage
        .from(EVENT_IMAGES_BUCKET)
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
