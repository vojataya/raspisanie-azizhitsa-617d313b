import { useMemo } from 'react';
import { EventWithLessonType } from '@/types/database';
import { parseISO, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CalendarViewProps {
  events: EventWithLessonType[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onEventClick: (event: EventWithLessonType) => void;
}

const hexToRgba = (hex: string, opacity: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

function CalendarEventItem({ event, onClick }: { event: EventWithLessonType; onClick: () => void }) {
  const lt = event.lesson_type;
  const startTime = format(parseISO(event.start_at), 'HH:mm');

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="cursor-pointer p-1.5 mb-1 text-xs hover:opacity-80 transition-opacity overflow-hidden"
      style={{ 
        backgroundColor: hexToRgba(lt.card_bg_color, Number(lt.card_bg_opacity)),
        borderLeft: `3px solid ${lt.date_box_color}`,
        color: lt.text_color
      }}
    >
      <div className="font-medium break-words">{event.title}</div>
      <div className="flex items-center gap-1 mt-0.5 opacity-80">
        <span className="font-semibold" style={{ color: lt.date_box_color }}>{lt.name.toUpperCase()}</span>
        {event.mode && <span className="mx-0.5">·</span>}
        {event.mode && <span>{event.mode.toUpperCase()}</span>}
      </div>
      <div className="flex items-center gap-1 mt-0.5 opacity-70">
        <Clock className="w-3 h-3" />
        <span>{startTime}</span>
      </div>
    </div>
  );
}

export function CalendarView({ events, currentMonth, onMonthChange, onEventClick }: CalendarViewProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventWithLessonType[]>();
    events.forEach(event => {
      const dateKey = format(parseISO(event.start_at), 'yyyy-MM-dd');
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(event);
    });
    // Sort events within each day by start time
    map.forEach((dayEvents) => {
      dayEvents.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
    });
    return map;
  }, [events]);

  const monthYearLabel = format(currentMonth, 'LLLL yyyy', { locale: ru });

  return (
    <div className="bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => onMonthChange(subMonths(currentMonth, 1))}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-lg font-semibold capitalize">{monthYearLabel}</h2>
        <Button variant="ghost" size="icon" onClick={() => onMonthChange(addMonths(currentMonth, 1))}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {weekDays.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 auto-rows-min">
        {days.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDate.get(dateKey) || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={index}
              className={`min-h-[100px] border-r border-b last:border-r-0 p-1 ${
                !isCurrentMonth ? 'bg-muted/30' : ''
              }`}
            >
              <div className={`text-sm font-medium mb-1 p-1 ${
                isToday ? 'bg-primary text-primary-foreground w-7 h-7 flex items-center justify-center' : ''
              } ${!isCurrentMonth ? 'text-muted-foreground' : ''}`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayEvents.map(event => (
                  <CalendarEventItem
                    key={event.id}
                    event={event}
                    onClick={() => onEventClick(event)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
