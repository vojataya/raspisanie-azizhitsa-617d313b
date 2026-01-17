import { useState, useEffect } from 'react';
import { useEvents } from '@/hooks/useEvents';
import { useLessonTypes } from '@/hooks/useLessonTypes';
import { useWidgetSettings } from '@/hooks/useWidgetSettings';
import { EventWithLessonType } from '@/types/database';
import { formatMonthShort, formatDay, formatDayOfWeekShort, formatTimeRange, formatFullDate } from '@/lib/dateUtils';
import { parseISO } from 'date-fns';
import { MapPin, Clock, X, Calendar, User, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ru } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

function EventCard({ event, onClick }: { event: EventWithLessonType; onClick: () => void }) {
  const date = parseISO(event.start_at);
  const lt = event.lesson_type;
  const hexToRgba = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16); const g = parseInt(hex.slice(3, 5), 16); const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  return (
    <div onClick={onClick} className="cursor-pointer overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full flex flex-col" style={{ boxShadow: 'var(--widget-shadow)' }}>
      <div className="relative">
        <div className="absolute top-3 left-3 z-10 px-3 py-2 text-center shadow-md" style={{ backgroundColor: lt.date_box_color }}>
          <div className="text-white text-xs font-bold">{formatDayOfWeekShort(date)}</div>
          <div className="text-white text-2xl font-bold leading-none">{formatDay(date)}</div>
          <div className="text-white text-xs font-bold">{formatMonthShort(date)}</div>
        </div>
        {event.image_url ? <img src={event.image_url} alt={event.title} className="w-full h-44 object-cover" /> : <div className="w-full h-44" style={{ backgroundColor: hexToRgba(lt.card_bg_color, Number(lt.card_bg_opacity)) }} />}
      </div>
      <div className="p-4 flex-1 flex flex-col" style={{ backgroundColor: hexToRgba(lt.card_bg_color, Number(lt.card_bg_opacity)), color: lt.text_color }}>
        <div className="text-xs font-bold mb-1" style={{ color: lt.date_box_color }}>{lt.name.toUpperCase()}</div>
        <h3 className="font-bold text-lg mb-2">{event.title}</h3>
        <div className="space-y-1 text-sm opacity-80 mt-auto">
          <div className="flex items-center gap-2"><Clock className="w-4 h-4 flex-shrink-0" /><span>{formatTimeRange(event.start_at, event.end_at)}</span></div>
          {event.teacher && <div className="flex items-center gap-2"><User className="w-4 h-4 flex-shrink-0" /><span className="truncate">{event.teacher}</span></div>}
          {event.location && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 flex-shrink-0" /><span className="truncate">{event.location}</span></div>}
        </div>
      </div>
    </div>
  );
}

function EventPopup({ event, onClose }: { event: EventWithLessonType; onClose: () => void }) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleEsc); document.body.style.overflow = ''; };
  }, [onClose]);

  const lt = event.lesson_type;

  const hexToRgba = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16); const g = parseInt(hex.slice(3, 5), 16); const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" style={{ backgroundColor: hexToRgba(lt.card_bg_color, Number(lt.card_bg_opacity)), color: lt.text_color }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-white/90 hover:bg-white shadow-md transition-colors" style={{ color: '#000' }}><X className="w-5 h-5" /></button>
        {event.image_url && <img src={event.image_url} alt={event.title} className="w-full max-h-96 object-contain bg-muted" />}
        <div className="p-6 space-y-4">
          <div><span className="text-xs font-bold px-2 py-1" style={{ backgroundColor: lt.date_box_color, color: '#fff' }}>{lt.name.toUpperCase()}</span></div>
          <h2 className="text-2xl font-bold">{event.title}</h2>
          {event.description_full && <div className="prose prose-sm max-w-none opacity-80" style={{ color: lt.text_color }} dangerouslySetInnerHTML={{ __html: event.description_full }} />}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-current/20">
            <div><div className="text-xs font-bold opacity-60 mb-1">КОГДА</div><div className="flex items-center gap-2"><Calendar className="w-4 h-4" /><span>{formatFullDate(event.start_at)}</span></div><div className="flex items-center gap-2 mt-1"><Clock className="w-4 h-4" /><span>{formatTimeRange(event.start_at, event.end_at)}</span></div></div>
            {event.location && <div><div className="text-xs font-bold opacity-60 mb-1">ГДЕ</div><div className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span>{event.location}</span></div></div>}
          </div>
          {event.teacher && <div className="flex items-center gap-2 pt-4 border-t border-current/20"><User className="w-4 h-4" /><span className="font-medium">{event.teacher}</span></div>}
        </div>
      </div>
    </div>
  );
}

export default function ScheduleWidget() {
  const { data: settings } = useWidgetSettings();
  const { data: lessonTypes } = useLessonTypes();
  const [lessonTypeFilter, setLessonTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<EventWithLessonType | null>(null);

  const { data: events, isLoading } = useEvents({
    publishedOnly: true,
    showPast: settings?.show_past_events ?? false,
    lessonTypeId: lessonTypeFilter !== 'all' ? lessonTypeFilter : undefined,
    startDate: dateRange?.from,
    endDate: dateRange?.to,
    limit: settings?.max_events ?? 20,
  });

  const formatDateRangeLabel = () => {
    if (!dateRange?.from) return 'Выберите даты';
    if (!dateRange.to) return dateRange.from.toLocaleDateString('ru-RU');
    return `${dateRange.from.toLocaleDateString('ru-RU')} – ${dateRange.to.toLocaleDateString('ru-RU')}`;
  };

  return (
    <div className="min-h-screen bg-transparent widget-container">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-between">
                <Calendar className="w-4 h-4 mr-2" />
                {formatDateRangeLabel()}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent 
                mode="range" 
                selected={dateRange} 
                onSelect={setDateRange} 
                locale={ru}
                numberOfMonths={2}
              />
              <div className="p-2 border-t">
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setDateRange(undefined)}>
                  Сбросить
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Select value={lessonTypeFilter} onValueChange={setLessonTypeFilter}>
            <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="Все виды" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Все виды</SelectItem>{lessonTypes?.map(lt => <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {isLoading ? <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div> : events && events.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{events.map(event => <EventCard key={event.id} event={event} onClick={() => setSelectedEvent(event)} />)}</div>
        ) : <div className="text-center py-12 text-muted-foreground">Нет событий для отображения</div>}
      </div>

      {selectedEvent && <EventPopup event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}