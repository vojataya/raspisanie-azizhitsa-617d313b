import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useLessonType, useCreateLessonType, useUpdateLessonType } from '@/hooks/useLessonTypes';
import { ArrowLeft, MapPin, Clock } from 'lucide-react';

export default function LessonTypeFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  
  const { data: lessonType, isLoading } = useLessonType(id);
  const createLessonType = useCreateLessonType();
  const updateLessonType = useUpdateLessonType();

  const [formData, setFormData] = useState({
    name: '',
    card_bg_color: '#E8D5B7',
    card_bg_opacity: 0.95,
    date_box_color: '#D4A574',
    text_color: '#2C1810',
    is_default: false,
  });

  useEffect(() => {
    if (lessonType) {
      setFormData({
        name: lessonType.name,
        card_bg_color: lessonType.card_bg_color,
        card_bg_opacity: Number(lessonType.card_bg_opacity),
        date_box_color: lessonType.date_box_color,
        text_color: lessonType.text_color,
        is_default: lessonType.is_default,
      });
    }
  }, [lessonType]);

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await updateLessonType.mutateAsync({ id, ...formData });
      } else {
        await createLessonType.mutateAsync(formData);
      }
      navigate('/admin/lesson-types');
    } catch (error) {}
  };

  if (isEditing && isLoading) {
    return <AdminLayout title="Загрузка..."><div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div></AdminLayout>;
  }

  const hexToRgba = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  return (
    <AdminLayout title={isEditing ? 'Редактирование вида занятия' : 'Новый вид занятия'} actions={<Button variant="ghost" onClick={() => navigate('/admin/lesson-types')}><ArrowLeft className="w-4 h-4 mr-2" />Назад</Button>}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Основная информация</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label htmlFor="name">Название</Label><Input id="name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Курс" /></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Цвета</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="card_bg_color">Фон карточки</Label><div className="flex gap-2"><Input id="card_bg_color" type="color" value={formData.card_bg_color} onChange={(e) => handleChange('card_bg_color', e.target.value)} className="w-12 h-10 p-1" /><Input value={formData.card_bg_color} onChange={(e) => handleChange('card_bg_color', e.target.value)} className="flex-1" /></div></div>
                <div className="space-y-2"><Label htmlFor="date_box_color">Цвет даты</Label><div className="flex gap-2"><Input id="date_box_color" type="color" value={formData.date_box_color} onChange={(e) => handleChange('date_box_color', e.target.value)} className="w-12 h-10 p-1" /><Input value={formData.date_box_color} onChange={(e) => handleChange('date_box_color', e.target.value)} className="flex-1" /></div></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="text_color">Цвет текста</Label><div className="flex gap-2"><Input id="text_color" type="color" value={formData.text_color} onChange={(e) => handleChange('text_color', e.target.value)} className="w-12 h-10 p-1" /><Input value={formData.text_color} onChange={(e) => handleChange('text_color', e.target.value)} className="flex-1" /></div></div>
                <div className="space-y-2"><Label>Прозрачность фона: {Math.round(formData.card_bg_opacity * 100)}%</Label><Slider value={[formData.card_bg_opacity * 100]} onValueChange={([v]) => handleChange('card_bg_opacity', v / 100)} max={100} step={5} className="mt-2" /></div>
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-4"><Button type="submit" disabled={createLessonType.isPending || updateLessonType.isPending}>{createLessonType.isPending || updateLessonType.isPending ? 'Сохранение...' : 'Сохранить'}</Button><Button type="button" variant="outline" onClick={() => navigate('/admin/lesson-types')}>Отмена</Button></div>
        </form>
        <div>
          <Card><CardHeader><CardTitle>Превью карточки</CardTitle></CardHeader><CardContent>
            <div className="relative rounded-lg overflow-hidden shadow-lg" style={{ maxWidth: 280 }}>
              <div className="absolute top-3 left-3 z-10 rounded-lg px-3 py-2 text-center" style={{ backgroundColor: formData.date_box_color }}><div className="text-white text-xs font-bold">ЯНВ.</div><div className="text-white text-2xl font-bold">15</div></div>
              <div className="h-40 bg-muted" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div className="p-4" style={{ backgroundColor: hexToRgba(formData.card_bg_color, formData.card_bg_opacity), color: formData.text_color }}>
                <div className="text-xs font-bold mb-1" style={{ color: formData.date_box_color }}>{formData.name.toUpperCase() || 'КУРС'}</div>
                <h3 className="font-bold mb-2">{formData.name || 'Название события'}</h3>
                <div className="flex items-center gap-1 text-sm opacity-80"><Clock className="w-3 h-3" /><span>10:00 – 12:00</span></div>
                <div className="flex items-center gap-1 text-sm opacity-80 mt-1"><MapPin className="w-3 h-3" /><span>Санкт-Петербург</span></div>
              </div>
            </div>
          </CardContent></Card>
        </div>
      </div>
    </AdminLayout>
  );
}
