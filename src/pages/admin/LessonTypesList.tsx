import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLessonTypes, useDeleteLessonType, useEventsCountByLessonType } from '@/hooks/useLessonTypes';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { LessonType } from '@/types/database';

function LessonTypeRow({ 
  lessonType, 
  onDelete,
  allLessonTypes 
}: { 
  lessonType: LessonType; 
  onDelete: (id: string, count: number) => void;
  allLessonTypes: LessonType[];
}) {
  const { data: eventsCount } = useEventsCountByLessonType(lessonType.id);

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded"
            style={{ backgroundColor: lessonType.card_bg_color }}
          />
          <span className="font-medium">{lessonType.name}</span>
        </div>
      </TableCell>
      <TableCell>
        <span 
          className="px-2 py-1 rounded text-xs font-bold"
          style={{ 
            backgroundColor: lessonType.date_box_color,
            color: '#fff'
          }}
        >
          {lessonType.label}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded border"
            style={{ backgroundColor: lessonType.card_bg_color }}
            title="Цвет фона"
          />
          <div
            className="w-4 h-4 rounded border"
            style={{ backgroundColor: lessonType.date_box_color }}
            title="Цвет даты"
          />
          <div
            className="w-4 h-4 rounded border"
            style={{ backgroundColor: lessonType.text_color }}
            title="Цвет текста"
          />
        </div>
      </TableCell>
      <TableCell>{eventsCount ?? 0}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            asChild
          >
            <Link to={`/admin/lesson-types/${lessonType.id}`} title="Редактировать">
              <Pencil className="w-4 h-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(lessonType.id, eventsCount ?? 0)}
            title="Удалить"
            disabled={allLessonTypes.length <= 1}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function LessonTypesListPage() {
  const { data: lessonTypes, isLoading } = useLessonTypes();
  const deleteLessonType = useDeleteLessonType();
  
  const [deleteState, setDeleteState] = useState<{
    id: string;
    eventsCount: number;
    transferToId?: string;
  } | null>(null);

  const handleDelete = () => {
    if (deleteState) {
      deleteLessonType.mutate({
        id: deleteState.id,
        transferToId: deleteState.eventsCount > 0 ? deleteState.transferToId : undefined,
      });
      setDeleteState(null);
    }
  };

  const otherLessonTypes = lessonTypes?.filter(lt => lt.id !== deleteState?.id) ?? [];

  return (
    <AdminLayout 
      title="Виды занятий"
      actions={
        <Button asChild>
          <Link to="/admin/lesson-types/new">
            <Plus className="w-4 h-4 mr-2" />
            Добавить вид
          </Link>
        </Button>
      }
    >
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Подпись</TableHead>
              <TableHead>Цвета</TableHead>
              <TableHead>Событий</TableHead>
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
            ) : lessonTypes && lessonTypes.length > 0 ? (
              lessonTypes.map(lt => (
                <LessonTypeRow 
                  key={lt.id} 
                  lessonType={lt} 
                  allLessonTypes={lessonTypes}
                  onDelete={(id, count) => setDeleteState({ id, eventsCount: count })}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Нет видов занятий
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteState} onOpenChange={() => setDeleteState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить вид занятия?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteState?.eventsCount && deleteState.eventsCount > 0 ? (
                <>
                  К этому виду занятия привязано {deleteState.eventsCount} событий.
                  <br />
                  Выберите, на какой вид перенести события:
                </>
              ) : (
                'Это действие нельзя отменить.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteState?.eventsCount && deleteState.eventsCount > 0 && (
            <div className="py-4">
              <Select 
                value={deleteState.transferToId} 
                onValueChange={(v) => setDeleteState(prev => prev ? { ...prev, transferToId: v } : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите вид занятия" />
                </SelectTrigger>
                <SelectContent>
                  {otherLessonTypes.map(lt => (
                    <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteState?.eventsCount && deleteState.eventsCount > 0 && !deleteState.transferToId}
            >
              Удалить
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
