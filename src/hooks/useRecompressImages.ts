import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { compressImage } from '@/lib/imageCompression';
import {
  loadRecompressPlan,
  recompressExisting,
  type RecompressPlan,
  type RecompressProgress,
  type RecompressReport,
} from '@/lib/recompressExisting';

/** Обвязка разового сжатия уже загруженных фото для страницы настроек. */
export function useRecompressImages() {
  const queryClient = useQueryClient();
  const [preparing, setPreparing] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<RecompressProgress | null>(null);
  const [report, setReport] = useState<RecompressReport | null>(null);

  /** Собирает список файлов (для подтверждения перед запуском). */
  const prepare = async (): Promise<RecompressPlan> => {
    setPreparing(true);
    try {
      return await loadRecompressPlan(supabase);
    } finally {
      setPreparing(false);
    }
  };

  const run = async (plan: RecompressPlan): Promise<RecompressReport> => {
    setRunning(true);
    setReport(null);
    setProgress({ done: 0, total: plan.files.length });
    try {
      const result = await recompressExisting(
        {
          supabase,
          fetchFile: (url) => fetch(url),
          compress: (file) => compressImage(file),
          onProgress: setProgress,
        },
        plan,
      );
      setReport(result);
      return result;
    } finally {
      setRunning(false);
      await queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  };

  return { prepare, run, preparing, running, progress, report };
}
