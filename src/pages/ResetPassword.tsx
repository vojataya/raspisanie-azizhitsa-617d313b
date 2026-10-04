import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { z } from 'zod';
import { XCircle, MailQuestion } from 'lucide-react';
import { consumeInitialUrl } from '@/lib/initialUrl';
import { parseRecoveryLink } from '@/lib/recoveryLink';

type Status = 'checking' | 'ready' | 'invalid' | 'no-link';

const passwordSchema = z
  .object({
    password: z.string().min(8, 'Пароль должен быть не менее 8 символов'),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'Пароли не совпадают',
    path: ['confirm'],
  });

// Убираем токен или ошибку из адресной строки, чтобы перезагрузка страницы не обрабатывала ссылку повторно
function clearUrlParams() {
  window.history.replaceState(window.history.state, '', window.location.pathname);
}

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const { hash, search } = consumeInitialUrl();
    const link = parseRecoveryLink(hash, search);

    if (link.kind === 'error') {
      clearUrlParams();
      setStatus('invalid');
      return;
    }

    if (link.kind === 'token_hash') {
      // Наш вид ссылки: подтверждаем токен сами, после этого появляется сессия
      supabase.auth
        .verifyOtp({ token_hash: link.tokenHash, type: 'recovery' })
        .then(({ error }) => {
          if (!active) return;
          clearUrlParams();
          setStatus(error ? 'invalid' : 'ready');
        });
      return () => {
        active = false;
      };
    }

    // Стандартный вид ссылки (access_token в hash) supabase-js обрабатывает сам при инициализации,
    // getSession() дожидается её окончания; PASSWORD_RECOVERY может прийти и чуть позже
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && event === 'PASSWORD_RECOVERY' && session) {
        setStatus('ready');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (link.kind === 'implicit') clearUrlParams();
      if (session) {
        setStatus('ready');
      } else {
        setStatus((current) =>
          current === 'checking' ? (link.kind === 'implicit' ? 'invalid' : 'no-link') : current
        );
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async () => {
    const parsed = passwordSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setSaving(true);
    try {
      const { error } = await updatePassword(parsed.data.password);
      if (error) {
        if (error.code === 'same_password') {
          toast.error('Новый пароль должен отличаться от старого');
        } else if (error.code === 'weak_password') {
          toast.error('Пароль слишком простой, придумайте более надёжный');
        } else if (error.code === 'session_not_found' || error.name === 'AuthSessionMissingError') {
          setStatus('invalid');
        } else {
          toast.error(error.message);
        }
        return;
      }
      toast.success('Пароль изменён');
      navigate('/admin', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Админ-панель</CardTitle>
          <CardDescription>Смена пароля</CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'checking' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Проверяем ссылку...</p>
            </div>
          )}

          {status === 'ready' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Новый пароль</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Минимум 8 символов"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={saving}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Повторите пароль</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={saving}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить пароль'}
              </Button>
            </div>
          )}

          {status === 'invalid' && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>Ссылка недействительна или устарела</AlertDescription>
              </Alert>
              <Button
                className="w-full"
                onClick={() => navigate('/auth', { state: { forgotPassword: true } })}
              >
                Запросить новую ссылку
              </Button>
            </div>
          )}

          {status === 'no-link' && (
            <div className="space-y-4">
              <Alert>
                <MailQuestion className="h-4 w-4" />
                <AlertDescription>Откройте ссылку из письма</AlertDescription>
              </Alert>
              <div className="text-center">
                <Link to="/auth" className="text-sm text-primary underline-offset-4 hover:underline">
                  Перейти ко входу
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
