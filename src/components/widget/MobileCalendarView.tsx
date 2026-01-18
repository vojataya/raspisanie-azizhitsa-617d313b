import { useMemo, useRef, TouchEvent } from 'react';
import { EventWithLessonType } from '@/types/database';
import { parseISO, format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileCalendarViewProps {
  events: EventWithLessonType[];
  currentWeek: Date;
  onWeekChange: (date: Date) => void;
  onEventClick: (event: EventWithLessonType) => void;
}

const hexToRgba = (hex: string, opacity: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

function WeekEventItem({ event, onClick }: { event: EventWithLessonType; onClick: () => void }) {
  const lt = event.lesson_type;
  const startTime = format(parseISO(event.start_at), 'HH:mm');

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="cursor-pointer p-3 text-sm hover:opacity-80 transition-opacity flex items-start gap-3"
      style={{ 
        backgroundColor: hexToRgba(lt.card_bg_color, Number(lt.card_bg_opacity)),
        borderLeft: `4px solid ${lt.date_box_color}`,
        color: lt.text_color
      }}
    >
      {/* Time column */}
      <div className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium opacity-80 pt-0.5">
        <Clock className="w-3.5 h-3.5" />
        <span>{startTime}</span>
      </div>
      
      {/* Content column */}
      <div className="flex-1 min-w-0">
        <div className="font-medium leading-tight line-clamp-2">{event.title}</div>
        <div className="flex items-center gap-2 mt-1 text-xs opacity-70">
          <span className="font-semibold" style={{ color: lt.date_box_color }}>{lt.name.toUpperCase()}</span>
          {event.mode && (
            <>
              <span>·</span>
              <span>{event.mode.toUpperCase()}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function MobileCalendarView({ events, currentWeek, onWeekChange, onEventClick }: MobileCalendarViewProps) {
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

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

  const weekLabel = useMemo(() => {
    const startMonth = format(weekStart, 'LLLL', { locale: ru });
    const endMonth = format(weekEnd, 'LLLL', { locale: ru });
    const startDay = format(weekStart, 'd');
    const endDay = format(weekEnd, 'd');
    const year = format(weekEnd, 'yyyy');
    
    if (startMonth === endMonth) {
      return `${startDay}–${endDay} ${startMonth} ${year}`;
    }
    return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${year}`;
  }, [weekStart, weekEnd]);

  // Swipe handling
  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        // Swipe left - next week
        onWeekChange(addWeeks(currentWeek, 1));
      } else {
        // Swipe right - previous week
        onWeekChange(subWeeks(currentWeek, 1));
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const weekDaysFull = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const weekDaysShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div className="bg-white shadow-lg">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white border-b">
        <div className="flex items-center justify-between p-3">
          <Button variant="ghost" size="icon" onClick={() => onWeekChange(subWeeks(currentWeek, 1))}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-base font-semibold capitalize text-center">{weekLabel}</h2>
          <Button variant="ghost" size="icon" onClick={() => onWeekChange(addWeeks(currentWeek, 1))}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Vertical week list with swipe support */}
      <div 
        className="divide-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {days.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDate.get(dateKey) || [];
          const isToday = isSameDay(day, new Date());
          const dayNumber = format(day, 'd');

          return (
            <div key={index} className="p-3">
              {/* Day header */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 flex items-center justify-center font-bold text-lg ${
                  isToday ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                }`}>
                  {dayNumber}
                </div>
                <div>
                  <div className="font-medium text-sm hidden sm:block">{weekDaysFull[index]}</div>
                  <div className="font-medium text-sm sm:hidden">{weekDaysShort[index]}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(day, 'd MMMM', { locale: ru })}
                  </div>
                </div>
              </div>

              {/* Events list */}
              {dayEvents.length > 0 ? (
                <div className="space-y-2 ml-13">
                  {dayEvents.map(event => (
                    <WeekEventItem
                      key={event.id}
                      event={event}
                      onClick={() => onEventClick(event)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground ml-13 py-2">
                  Нет событий
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
