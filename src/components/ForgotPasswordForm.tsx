import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { z } from 'zod';
import { MailCheck } from 'lucide-react';
import { isEmailRateLimitError } from '@/lib/recoveryLink';

const emailSchema = z.string().trim().email('Введите корректный email');

interface ForgotPasswordFormProps {
  initialEmail?: string;
  onBack: () => void;
}

export function ForgotPasswordForm({ initialEmail = '', onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      const { error } = await resetPassword(parsed.data);
      if (error) {
        if (isEmailRateLimitError(error)) {
          toast.error('Слишком много запросов. Попробуйте через час');
        } else {
          toast.error(error.message);
        }
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-4">
        <Alert>
          <MailCheck className="h-4 w-4" />
          <AlertDescription>
            Если такой адрес зарегистрирован, мы отправили на него письмо со ссылкой для смены пароля.
            Проверьте почту и папку „Спам“
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="w-full" onClick={onBack}>
          Назад ко входу
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Укажите email, с которым вы входите в админ-панель. Мы пришлём ссылку для смены пароля.
      </p>
      <div className="space-y-2">
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          placeholder="admin@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
      </div>
      <Button className="w-full" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Отправка...' : 'Отправить ссылку'}
      </Button>
      <div className="text-center">
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-sm text-muted-foreground"
          onClick={onBack}
          disabled={loading}
        >
          Назад ко входу
        </Button>
      </div>
    </div>
  );
}
