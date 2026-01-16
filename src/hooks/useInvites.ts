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
    mutationFn: async ({ id, usedBy }: { id: string; usedBy: string | null }) => {
      // If the invite was used, also revoke user access
      if (usedBy) {
        // Delete user role
        const { error: roleError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', usedBy);
        
        if (roleError) throw roleError;

        // Delete profile
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', usedBy);
        
        if (profileError) throw profileError;
      }

      // Delete the invite
      const { error } = await supabase
        .from('invites')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      if (variables.usedBy) {
        toast.success('Инвайт отменён, доступ пользователя отозван');
      } else {
        toast.success('Инвайт удален');
      }
    },
    onError: () => {
      toast.error('Ошибка при удалении инвайта');
    },
  });
}