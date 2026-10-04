import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useWidgetSettings, useUpdateWidgetSettings } from '@/hooks/useWidgetSettings';
import { Copy, Check, ImageDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useIsAdmin } from '@/hooks/useUserRole';
import { useRecompressImages } from '@/hooks/useRecompressImages';
import { formatBytes } from '@/lib/imageCompression';
import type { RecompressPlan } from '@/lib/recompressExisting';

function RecompressImagesCard() {
  const { prepare, run, preparing, running, progress, report } = useRecompressImages();
  const [plan, setPlan] = useState<RecompressPlan | null>(null);

  // Пока идёт обработка, предупреждаем о закрытии вкладки.
  useEffect(() => {
    if (!running) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [running]);

  const handlePrepare = async () => {
    try {
      const loaded = await prepare();
      if (loaded.files.length === 0) {
        toast.info('Загруженных фото не найдено');
        return;
      }
      setPlan(loaded);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось получить список фото');
    }
  };

  const handleRun = async () => {
    if (!plan) return;
    const current = plan;
    setPlan(null);
    try {
      const result = await run(current);
      if (result.errors.length === 0) toast.success('Готово: фото обработаны');
      else toast.warning(`Готово, но с ошибками: ${result.errors.length}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при сжатии фото');
    }
  };

  const eventsInPlan = plan ? plan.files.reduce((sum, f) => sum + f.events.length, 0) : 0;
  const percent = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Сжатие загруженных фото</CardTitle>
        <CardDescription>Разовая обработка фото, которые загрузили раньше</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Фото больше 1 МБ будут бережно уменьшены (до 2000 px по длинной стороне) и сохранены новыми файлами — виджет станет
          открываться быстрее. Оригиналы остаются в хранилище. Заодно адреса картинок приводятся к единому виду. Запускать
          можно повторно: уже обработанные фото пропускаются.
        </p>
        <Button variant="outline" onClick={handlePrepare} disabled={preparing || running}>
          <ImageDown className="w-4 h-4 mr-2" />
          {preparing ? 'Считаю фото...' : running ? 'Обработка...' : 'Сжать уже загруженные фото'}
        </Button>

        {progress && (running || report) && (
          <div className="space-y-2">
            <Progress value={percent} className="h-2" />
            <p className="text-sm text-muted-foreground">Обработано {progress.done} из {progress.total}</p>
          </div>
        )}

        {report && !running && (
          <div className="space-y-2 rounded-lg bg-muted p-4 text-sm">
            <p className="font-medium">
              Сжато {report.compressedFiles} фото: {formatBytes(report.bytesBefore)} → {formatBytes(report.bytesAfter)}; адресов
              исправлено {report.addressesFixed}; ошибок {report.errors.length}
            </p>
            {report.errors.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-destructive">
                {report.errors.map((err, i) => (
                  <li key={`${err.path}-${i}`} className="break-all">
                    {err.path}: {err.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!plan} onOpenChange={(open) => { if (!open) setPlan(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Сжать загруженные фото?</AlertDialogTitle>
            <AlertDialogDescription>
              Будет проверено файлов: {plan?.files.length ?? 0} (используются в событиях: {eventsInPlan}). Фото больше 1 МБ
              сожмутся и загрузятся новыми файлами, оригиналы останутся в хранилище. Не закрывайте страницу до окончания.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleRun}>Запустить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default function WidgetSettingsPage() {
  const { data: settings, isLoading } = useWidgetSettings();
  const updateSettings = useUpdateWidgetSettings();
  const { isAdmin } = useIsAdmin();
  const [copied, setCopied] = useState(false);

  const publishedUrl = 'https://raspisanie-azizhitsa.lovable.app/schedule-widget';
  const embedCode = `<iframe src="${publishedUrl}" style="width:100%; border:0; min-height:800px;" loading="lazy"></iframe>`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Скопировано!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return <AdminLayout title="Настройки виджета"><div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div></AdminLayout>;
  }

  return (
    <AdminLayout title="Настройки виджета">
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader><CardTitle>Отображение событий</CardTitle><CardDescription>Настройте, какие события будут показываться в виджете</CardDescription></CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div><Label htmlFor="show-past">Показывать прошедшие события</Label><p className="text-sm text-muted-foreground">Если выключено, будут показываться только будущие события</p></div>
              <Switch id="show-past" checked={settings?.show_past_events ?? false} onCheckedChange={(checked) => updateSettings.mutate({ show_past_events: checked })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-events">Максимум событий</Label>
              <Input id="max-events" type="number" min={1} max={100} value={settings?.max_events ?? 20} onChange={(e) => updateSettings.mutate({ max_events: parseInt(e.target.value) || 20 })} className="w-32" />
              <p className="text-sm text-muted-foreground">Максимальное количество карточек в виджете</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Код для встраивания</CardTitle><CardDescription>Вставьте этот код на вашу страницу Tilda в блок HTML</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="relative"><pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">{embedCode}</pre><Button size="icon" variant="outline" className="absolute top-2 right-2" onClick={() => copyToClipboard(embedCode)}>{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</Button></div>
            <div className="flex gap-4">
              <Button variant="outline" asChild><a href={publishedUrl} target="_blank" rel="noopener noreferrer">Открыть виджет</a></Button>
              <Button variant="outline" onClick={() => copyToClipboard(publishedUrl)}>Копировать ссылку</Button>
            </div>
          </CardContent>
        </Card>

        {isAdmin && <RecompressImagesCard />}
      </div>
    </AdminLayout>
  );
}
