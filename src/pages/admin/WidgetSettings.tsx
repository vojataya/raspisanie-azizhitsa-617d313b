import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useWidgetSettings, useUpdateWidgetSettings } from '@/hooks/useWidgetSettings';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function WidgetSettingsPage() {
  const { data: settings, isLoading } = useWidgetSettings();
  const updateSettings = useUpdateWidgetSettings();
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
      </div>
    </AdminLayout>
  );
}
