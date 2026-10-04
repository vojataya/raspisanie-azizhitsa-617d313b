import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCheckInvite } from '@/hooks/useInvites';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { z } from 'zod';
import { CheckCircle, XCircle } from 'lucide-react';
import { ForgotPasswordForm } from '@/components/ForgotPasswordForm';

const authSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
});

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Режим «Забыли пароль?»; со страницы /reset-password можно прийти сразу в него
  const [forgotMode, setForgotMode] = useState(
    () => (location.state as { forgotPassword?: boolean } | null)?.forgotPassword === true
  );
  
  const { data: invite, isLoading: checkingInvite } = useCheckInvite(
    activeTab === 'register' ? email : ''
  );

  const handleSubmit = async (mode: 'login' | 'register') => {
    try {
      const validated = authSchema.parse({ email, password });
      
      if (mode === 'register' && !invite) {
        toast.error('Регистрация доступна только по приглашению');
        return;
      }
      
      setLoading(true);

      if (mode === 'login') {
        const { error } = await signIn(validated.email, validated.password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Неверный email или пароль');
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success('Вход выполнен');
        navigate('/admin');
      } else {
        const { error } = await signUp(validated.email, validated.password);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Пользователь с таким email уже зарегистрирован');
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success('Регистрация успешна!');
        navigate('/admin');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    } finally {
      setLoading(false);
    }
  };

  const canRegister = invite !== null && !checkingInvite;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Админ-панель</CardTitle>
          <CardDescription>{forgotMode ? 'Восстановление пароля' : 'Управление расписанием занятий'}</CardDescription>
        </CardHeader>
        <CardContent>
          {forgotMode && (
            <ForgotPasswordForm initialEmail={email} onBack={() => setForgotMode(false)} />
          )}
          <Tabs value={activeTab} onValueChange={setActiveTab} className={forgotMode ? 'hidden' : undefined}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Вход</TabsTrigger>
              <TabsTrigger value="register">Регистрация</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Пароль</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit('login')}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={() => handleSubmit('login')}
                disabled={loading}
              >
                {loading ? 'Вход...' : 'Войти'}
              </Button>
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm text-muted-foreground"
                  onClick={() => setForgotMode(true)}
                  disabled={loading}
                >
                  Забыли пароль?
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="register" className="space-y-4 mt-4">
              <Alert variant={canRegister ? 'default' : 'destructive'} className="mb-4">
                <div className="flex items-center gap-2">
                  {canRegister ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <AlertDescription className="text-green-600">
                        Приглашение найдено. Роль: {invite?.role === 'admin' ? 'Админ' : 'Редактор'}
                      </AlertDescription>
                    </>
                  ) : email && email.includes('@') && !checkingInvite ? (
                    <>
                      <XCircle className="w-4 h-4" />
                      <AlertDescription>
                        Приглашение не найдено. Обратитесь к администратору.
                      </AlertDescription>
                    </>
                  ) : (
                    <AlertDescription>
                      Регистрация доступна только по приглашению
                    </AlertDescription>
                  )}
                </div>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="Введите email из приглашения"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">Пароль</Label>
                <Input
                  id="register-password"
                  type="password"
                  placeholder="Минимум 6 символов"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || !canRegister}
                  onKeyDown={(e) => e.key === 'Enter' && canRegister && handleSubmit('register')}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={() => handleSubmit('register')}
                disabled={loading || !canRegister}
              >
                {loading ? 'Регистрация...' : 'Зарегистрироваться'}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}