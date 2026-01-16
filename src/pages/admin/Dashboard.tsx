import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEvents } from '@/hooks/useEvents';
import { useLessonTypes } from '@/hooks/useLessonTypes';
import { CalendarDays, Layers, ExternalLink, Eye } from 'lucide-react';

export default function AdminDashboard() {
  const { data: events } = useEvents({ showPast: true });
  const { data: lessonTypes } = useLessonTypes();

  const publishedEvents = events?.filter(e => e.is_published).length ?? 0;
  const futureEvents = events?.filter(e => new Date(e.start_at) >= new Date()).length ?? 0;

  return (
    <AdminLayout 
      title="Обзор"
      actions={
        <Button asChild variant="outline">
          <a href="/schedule-widget" target="_blank" rel="noopener noreferrer">
            <Eye className="w-4 h-4 mr-2" />
            Открыть виджет
          </a>
        </Button>
      }
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Всего событий</CardTitle>
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {publishedEvents} опубликовано
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Предстоящие</CardTitle>
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{futureEvents}</div>
            <p className="text-xs text-muted-foreground">
              событий в будущем
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Виды занятий</CardTitle>
            <Layers className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lessonTypes?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              типов событий
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Виджет</CardTitle>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Link to="/admin/settings">
              <Button variant="outline" size="sm" className="w-full">
                Настроить
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Быстрые действия</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/admin/events/new">
                <CalendarDays className="w-4 h-4 mr-2" />
                Создать событие
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/admin/lesson-types/new">
                <Layers className="w-4 h-4 mr-2" />
                Создать вид занятия
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ближайшие события</CardTitle>
          </CardHeader>
          <CardContent>
            {events && events.length > 0 ? (
              <ul className="space-y-2">
                {events.slice(0, 5).map(event => (
                  <li key={event.id} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{event.title}</span>
                    <span className="text-muted-foreground ml-2">
                      {new Date(event.start_at).toLocaleDateString('ru-RU')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">Нет предстоящих событий</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
