import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LessonType } from '@/types/database';
import { toast } from 'sonner';

export function useLessonTypes() {
  return useQuery({
    queryKey: ['lesson-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_types')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as LessonType[];
    },
  });
}

export function useLessonType(id: string | undefined) {
  return useQuery({
    queryKey: ['lesson-types', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('lesson_types')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as LessonType;
    },
    enabled: !!id,
  });
}

export function useCreateLessonType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (lessonType: Omit<LessonType, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('lesson_types')
        .insert(lessonType)
        .select()
        .single();
      
      if (error) throw error;
      return data as LessonType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-types'] });
      toast.success('Вид занятия создан');
    },
    onError: (error: Error) => {
      toast.error('Ошибка создания: ' + error.message);
    },
  });
}

export function useUpdateLessonType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LessonType> & { id: string }) => {
      const { data, error } = await supabase
        .from('lesson_types')
        .update(updates)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Запись не найдена');
      return data[0] as LessonType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-types'] });
      toast.success('Вид занятия обновлён');
    },
    onError: (error: Error) => {
      toast.error('Ошибка обновления: ' + error.message);
    },
  });
}

export function useDeleteLessonType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, transferToId }: { id: string; transferToId?: string }) => {
      // If we need to transfer events to another lesson type
      if (transferToId) {
        const { error: transferError } = await supabase
          .from('events')
          .update({ lesson_type_id: transferToId })
          .eq('lesson_type_id', id);
        
        if (transferError) throw transferError;
      }
      
      const { error } = await supabase
        .from('lesson_types')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-types'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Вид занятия удалён');
    },
    onError: (error: Error) => {
      toast.error('Ошибка удаления: ' + error.message);
    },
  });
}

export function useEventsCountByLessonType(lessonTypeId: string) {
  return useQuery({
    queryKey: ['events-count', lessonTypeId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('lesson_type_id', lessonTypeId);
      
      if (error) throw error;
      return count ?? 0;
    },
  });
}
