import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useInvites, useCreateInvite, useDeleteInvite } from '@/hooks/useInvites';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Mail, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z
  .string()
  .email('Введите корректный email')
  .refine((v) => /^[\x00-\x7F]+$/.test(v), {
    message: 'Только латиница и обычный дефис "-" (без спецсимволов)',
  });

// Normalize common problematic characters so we store/display a consistent ASCII email.
const normalizeEmail = (value: string): string => {
  return value
    // Various dash types (incl. soft hyphen) to regular hyphen-minus
    .replace(/[\u00AD\u058A\u1806\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
    // Remove whitespace & zero-width chars
    .replace(/[\s\u200B-\u200D\u2060\uFEFF]/g, '');
};

export default function InvitesList() {
  const { data: invites, isLoading } = useInvites();
  const createInvite = useCreateInvite();
  const deleteInvite = useDeleteInvite();
  
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'editor'>('editor');

  const handleCreate = async () => {
    try {
      const normalized = normalizeEmail(email).toLowerCase().trim();
      emailSchema.parse(normalized);
      await createInvite.mutateAsync({ email: normalized, role });
      setEmail('');
      setRole('editor');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminLayout title="Управление доступом">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Создать инвайт</CardTitle>
            <CardDescription>
              Отправьте приглашение по email для регистрации в системе
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(normalizeEmail(e.target.value))}
                />
              </div>
              <div className="w-full md:w-40 space-y-2">
                <Label>Роль</Label>
                <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'editor')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Редактор</SelectItem>
                    <SelectItem value="admin">Админ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleCreate} 
                  disabled={createInvite.isPending || !email}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Создать
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Список инвайтов</CardTitle>
            <CardDescription>
              После создания инвайта пользователь сможет зарегистрироваться с указанным email
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : invites && invites.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Создан</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          {invite.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={invite.role === 'admin' ? 'default' : 'secondary'}>
                          {invite.role === 'admin' ? 'Админ' : 'Редактор'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(invite.created_at)}
                      </TableCell>
                      <TableCell>
                        {invite.used_at ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span>Использован</span>
                          </div>
                        ) : (
                          <Badge variant="outline">Ожидает</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {invite.used_at ? 'Отозвать доступ?' : 'Удалить инвайт?'}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {invite.used_at 
                                  ? `Пользователь ${invite.email} потеряет доступ к системе`
                                  : `Пользователь ${invite.email} не сможет зарегистрироваться`
                                }
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteInvite.mutate({ id: invite.id, usedBy: invite.used_by })}
                                className={invite.used_at ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
                              >
                                {invite.used_at ? 'Отозвать' : 'Удалить'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Нет инвайтов
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}