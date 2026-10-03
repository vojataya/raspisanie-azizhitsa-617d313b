import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useEvent, useCreateEvent, useUpdateEvent } from '@/hooks/useEvents';
import { useLessonTypes } from '@/hooks/useLessonTypes';
import { useImageUpload } from '@/hooks/useImageUpload';
import { toDisplayUrl } from '@/lib/imageUrl';
import { ArrowLeft, Upload, X, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { DateTimePicker } from '@/components/ui/datetime-picker';
export default function EventFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  
  const { data: event, isLoading: eventLoading } = useEvent(id);
  const { data: lessonTypes } = useLessonTypes();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const { uploadImage, uploading } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    image_url: '',
    lesson_type_id: '',
    mode: '',
    location: '',
    start_at: '',
    end_at: '',
    schedule: '',
    description_short: '',
    description_full: '',
    teacher: '',
    is_published: false,
  });

  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        image_url: event.image_url || '',
        lesson_type_id: event.lesson_type_id,
        mode: event.mode || '',
        location: event.location || '',
        start_at: formatDateTimeLocal(event.start_at),
        end_at: formatDateTimeLocal(event.end_at),
        schedule: event.schedule || '',
        description_short: event.description_short || '',
        description_full: event.description_full || '',
        teacher: event.teacher || '',
        is_published: event.is_published,
      });
      if (event.image_url && !event.image_url.includes('event-images')) {
        setImageMode('url');
      }
    } else if (lessonTypes && lessonTypes.length > 0 && !formData.lesson_type_id) {
      const defaultType = lessonTypes.find(lt => lt.is_default) || lessonTypes[0];
      setFormData(prev => ({ ...prev, lesson_type_id: defaultType.id }));
    }
  }, [event, lessonTypes]);

  const formatDateTimeLocal = (isoString: string) => {
    const date = new Date(isoString);
    return date.toISOString().slice(0, 16);
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите изображение');
      return;
    }

    const url = await uploadImage(file);
    if (url) {
      setFormData(prev => ({ ...prev, image_url: url }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Введите название события');
      return;
    }

    if (!formData.lesson_type_id) {
      toast.error('Выберите вид занятия');
      return;
    }

    if (!formData.start_at || !formData.end_at) {
      toast.error('Укажите дату и время');
      return;
    }

    const eventData = {
      title: formData.title,
      image_url: formData.image_url || null,
      lesson_type_id: formData.lesson_type_id,
      mode: formData.mode || null,
      location: formData.location || null,
      start_at: new Date(formData.start_at).toISOString(),
      end_at: new Date(formData.end_at).toISOString(),
      schedule: formData.schedule || null,
      description_short: formData.description_short || null,
      description_full: formData.description_full || null,
      teacher: formData.teacher || null,
      is_published: formData.is_published,
    };

    try {
      if (isEditing) {
        await updateEvent.mutateAsync({ id, ...eventData });
      } else {
        await createEvent.mutateAsync(eventData);
      }
      navigate('/admin/events');
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  if (isEditing && eventLoading) {
    return (
      <AdminLayout title="Загрузка...">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title={isEditing ? 'Редактирование события' : 'Новое событие'}
      actions={
        <Button variant="ghost" onClick={() => navigate('/admin/events')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className="max-w-3xl">
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Основная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Название *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Название события"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lesson_type">Вид занятия *</Label>
                  <Select 
                    value={formData.lesson_type_id} 
                    onValueChange={(v) => handleChange('lesson_type_id', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите вид" />
                    </SelectTrigger>
                    <SelectContent>
                      {lessonTypes?.map(lt => (
                        <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mode">Режим</Label>
                  <Input
                    id="mode"
                    value={formData.mode}
                    onChange={(e) => handleChange('mode', e.target.value)}
                    placeholder="Онлайн / Офлайн"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="teacher">Преподаватель</Label>
                  <Input
                    id="teacher"
                    value={formData.teacher}
                    onChange={(e) => handleChange('teacher', e.target.value)}
                    placeholder="Имя преподавателя"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Место проведения</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    placeholder="Адрес или ссылка"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Date & Time */}
          <Card>
            <CardHeader>
              <CardTitle>Дата и время</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Начало *</Label>
                  <DateTimePicker
                    value={formData.start_at}
                    onChange={(value) => handleChange('start_at', value)}
                    placeholder="Выберите дату и время начала"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Окончание *</Label>
                  <DateTimePicker
                    value={formData.end_at}
                    onChange={(value) => handleChange('end_at', value)}
                    placeholder="Выберите дату и время окончания"
                    defaultDate={formData.start_at ? new Date(formData.start_at) : undefined}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule">График</Label>
                <Input
                  id="schedule"
                  value={formData.schedule}
                  onChange={(e) => handleChange('schedule', e.target.value)}
                  placeholder="Например: каждую среду"
                />
              </div>
            </CardContent>
          </Card>

          {/* Image */}
          <Card>
            <CardHeader>
              <CardTitle>Изображение</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={imageMode} onValueChange={(v) => setImageMode(v as 'upload' | 'url')}>
                <TabsList>
                  <TabsTrigger value="upload">
                    <Upload className="w-4 h-4 mr-2" />
                    Загрузить
                  </TabsTrigger>
                  <TabsTrigger value="url">
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Ссылка
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="mt-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Загрузка...' : 'Выбрать файл'}
                  </Button>
                </TabsContent>

                <TabsContent value="url" className="mt-4">
                  <Input
                    placeholder="https://example.com/image.jpg"
                    value={formData.image_url}
                    onChange={(e) => handleChange('image_url', e.target.value)}
                  />
                </TabsContent>
              </Tabs>

              {formData.image_url && (
                <div className="relative inline-block">
                  <img
                    src={toDisplayUrl(formData.image_url)}
                    alt="Preview"
                    className="max-w-xs h-40 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => handleChange('image_url', '')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Описание</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Краткое описание</Label>
                <RichTextEditor
                  value={formData.description_short}
                  onChange={(value) => handleChange('description_short', value)}
                  placeholder="Краткое описание для превью"
                  minHeight="60px"
                />
              </div>

              <div className="space-y-2">
                <Label>Полное описание</Label>
                <RichTextEditor
                  value={formData.description_full}
                  onChange={(value) => handleChange('description_full', value)}
                  placeholder="Подробное описание события"
                  minHeight="150px"
                />
              </div>
            </CardContent>
          </Card>

          {/* Publishing */}
          <Card>
            <CardHeader>
              <CardTitle>Публикация</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_published">Опубликовать событие</Label>
                  <p className="text-sm text-muted-foreground">
                    Событие будет отображаться в виджете
                  </p>
                </div>
                <Switch
                  id="is_published"
                  checked={formData.is_published}
                  onCheckedChange={(v) => handleChange('is_published', v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button type="submit" disabled={createEvent.isPending || updateEvent.isPending}>
              {createEvent.isPending || updateEvent.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/admin/events')}>
              Отмена
            </Button>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}
