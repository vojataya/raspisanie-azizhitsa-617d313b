import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Event, EventWithLessonType } from '@/types/database';
import { toast } from 'sonner';

interface EventsFilter {
  lessonTypeId?: string;
  showPast?: boolean;
  search?: string;
  publishedOnly?: boolean;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}

export function useEvents(filter: EventsFilter = {}) {
  return useQuery({
    queryKey: ['events', filter],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select(`
          *,
          lesson_type:lesson_types(*)
        `)
        .order('start_at', { ascending: true });

      if (filter.lessonTypeId) {
        query = query.eq('lesson_type_id', filter.lessonTypeId);
      }

      if (filter.publishedOnly) {
        query = query.eq('is_published', true);
      }

      if (!filter.showPast) {
        query = query.gte('start_at', new Date().toISOString());
      }

      if (filter.startDate) {
        query = query.gte('start_at', filter.startDate.toISOString());
      }

      if (filter.endDate) {
        const endOfDay = new Date(filter.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('start_at', endOfDay.toISOString());
      }

      if (filter.search) {
        query = query.ilike('title', `%${filter.search}%`);
      }

      if (filter.limit) {
        query = query.limit(filter.limit);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as EventWithLessonType[];
    },
  });
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          lesson_type:lesson_types(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as EventWithLessonType;
    },
    enabled: !!id,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (event: Omit<Event, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('events')
        .insert(event)
        .select()
        .single();
      
      if (error) throw error;
      return data as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Событие создано');
    },
    onError: (error: Error) => {
      toast.error('Ошибка создания: ' + error.message);
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Event> & { id: string }) => {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Событие обновлено');
    },
    onError: (error: Error) => {
      toast.error('Ошибка обновления: ' + error.message);
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Событие удалено');
    },
    onError: (error: Error) => {
      toast.error('Ошибка удаления: ' + error.message);
    },
  });
}

export function useDuplicateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (eventId: string) => {
      // First get the event
      const { data: original, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Create a copy with a new title
      const { id, created_at, updated_at, ...eventData } = original;
      const { data, error } = await supabase
        .from('events')
        .insert({
          ...eventData,
          title: `${eventData.title} (копия)`,
          is_published: false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Событие скопировано');
    },
    onError: (error: Error) => {
      toast.error('Ошибка копирования: ' + error.message);
    },
  });
}
