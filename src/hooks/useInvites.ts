import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Invite {
  id: string;
  email: string;
  role: 'admin' | 'editor';
  invited_by: string | null;
  created_at: string;
  used_at: string | null;
}

export function useInvites() {
  return useQuery({
    queryKey: ['invites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Invite[];
    },
  });
}

export function useCheckInvite(email: string) {
  return useQuery({
    queryKey: ['invite-check', email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .is('used_at', null)
        .maybeSingle();
      
      if (error) throw error;
      return data as Invite | null;
    },
    enabled: !!email && email.includes('@'),
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'admin' | 'editor' }) => {
      const { data, error } = await supabase
        .from('invites')
        .insert({ email: email.toLowerCase().trim(), role })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      toast.success('Инвайт создан');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Инвайт для этого email уже существует');
      } else {
        toast.error('Ошибка при создании инвайта');
      }
    },
  });
}

export function useDeleteInvite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invites')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      toast.success('Инвайт удален');
    },
    onError: () => {
      toast.error('Ошибка при удалении инвайта');
    },
  });
}