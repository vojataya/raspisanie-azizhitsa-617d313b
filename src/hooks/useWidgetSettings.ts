import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WidgetSettings } from '@/types/database';
import { toast } from 'sonner';

export function useWidgetSettings() {
  return useQuery({
    queryKey: ['widget-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('widget_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (error) throw error;
      return data as WidgetSettings;
    },
  });
}

export function useUpdateWidgetSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: Partial<WidgetSettings>) => {
      // Get the current settings ID first
      const { data: current, error: fetchError } = await supabase
        .from('widget_settings')
        .select('id')
        .limit(1)
        .single();
      
      if (fetchError) throw fetchError;
      
      const { data, error } = await supabase
        .from('widget_settings')
        .update(updates)
        .eq('id', current.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as WidgetSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widget-settings'] });
      toast.success('Настройки сохранены');
    },
    onError: (error: Error) => {
      toast.error('Ошибка сохранения: ' + error.message);
    },
  });
}
