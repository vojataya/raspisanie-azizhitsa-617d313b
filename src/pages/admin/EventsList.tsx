import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
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
import { useEvents, useDeleteEvent, useDuplicateEvent } from '@/hooks/useEvents';
import { useLessonTypes } from '@/hooks/useLessonTypes';
import { Plus, Search, Pencil, Trash2, Copy, Eye, EyeOff } from 'lucide-react';
import { isPastEvent } from '@/lib/dateUtils';
import { Checkbox } from '@/components/ui/checkbox';

export default function EventsListPage() {
  const [search, setSearch] = useState('');
  const [lessonTypeFilter, setLessonTypeFilter] = useState<string>('all');
  const [showFutureOnly, setShowFutureOnly] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: events, isLoading } = useEvents({
    search: search || undefined,
    lessonTypeId: lessonTypeFilter !== 'all' ? lessonTypeFilter : undefined,
    showPast: !showFutureOnly,
  });
  const { data: lessonTypes } = useLessonTypes();
  const deleteEvent = useDeleteEvent();
  const duplicateEvent = useDuplicateEvent();

  const handleDelete = () => {
    if (deleteId) {
      deleteEvent.mutate(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <AdminLayout 
      title="События"
      actions={
        <Button asChild>
          <Link to="/admin/events/new">
            <Plus className="w-4 h-4 mr-2" />
            Добавить событие
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={lessonTypeFilter} onValueChange={setLessonTypeFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Все виды" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все виды</SelectItem>
              {lessonTypes?.map(lt => (
                <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Checkbox 
              id="future-only" 
              checked={showFutureOnly}
              onCheckedChange={(checked) => setShowFutureOnly(checked === true)}
            />
            <label htmlFor="future-only" className="text-sm cursor-pointer">
              Только будущие
            </label>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Вид занятия</TableHead>
                <TableHead>Дата и время</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Загрузка...
                  </TableCell>
                </TableRow>
              ) : events && events.length > 0 ? (
                events.map(event => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        style={{ 
                          backgroundColor: event.lesson_type.card_bg_color,
                          color: event.lesson_type.text_color,
                          borderColor: event.lesson_type.date_box_color
                        }}
                      >
                        {event.lesson_type.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(event.start_at).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {event.is_published ? (
                          <Badge variant="default" className="bg-green-600">
                            <Eye className="w-3 h-3 mr-1" />
                            Опубликовано
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <EyeOff className="w-3 h-3 mr-1" />
                            Черновик
                          </Badge>
                        )}
                        {isPastEvent(event.start_at) && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Прошло
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => duplicateEvent.mutate(event.id)}
                          title="Копировать"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <Link to={`/admin/events/${event.id}`} title="Редактировать">
                            <Pencil className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(event.id)}
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Нет событий
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить событие?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Событие будет удалено безвозвратно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
