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
  used_by: string | null;
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
      const { data, error } = await supabase.rpc('check_invite_for_email', {
        check_email: email.toLowerCase().trim(),
      });

      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row ? { role: row.role as 'admin' | 'editor' } : null;
    },
    enabled: !!email && email.includes('@'),
  });
}

// Normalize special dashes and invisible chars to ensure clean ASCII email
const normalizeEmail = (value: string): string => {
  return value
    .replace(/[\u00AD\u058A\u1806\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
    .replace(/[\s\u200B-\u200D\u2060\uFEFF]/g, '')
    .toLowerCase()
    .trim();
};

export function useCreateInvite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'admin' | 'editor' }) => {
      const normalizedEmail = normalizeEmail(email);
      const { data, error } = await supabase
        .from('invites')
        .insert({ email: normalizedEmail, role })
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
    mutationFn: async ({ id, usedBy }: { id: string; usedBy: string | null }) => {
      // If the invite was used, delete the user completely via edge function
      if (usedBy) {
        const { data, error } = await supabase.functions.invoke('delete-user', {
          body: { userId: usedBy },
        });
        
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      } else {
        // Just delete the unused invite
        const { error } = await supabase
          .from('invites')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      if (variables.usedBy) {
        toast.success('Доступ отозван, пользователь удален');
      } else {
        toast.success('Инвайт удален');
      }
    },
    onError: () => {
      toast.error('Ошибка при удалении');
    },
  });
}