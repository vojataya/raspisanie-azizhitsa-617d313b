import { useMemo, useState, useRef, TouchEvent } from 'react';
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

const MAX_VISIBLE_EVENTS = 2;

function MobileEventItem({ event, onClick }: { event: EventWithLessonType; onClick: () => void }) {
  const lt = event.lesson_type;
  const startTime = format(parseISO(event.start_at), 'HH:mm');

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="cursor-pointer p-2 mb-1.5 text-sm hover:opacity-80 transition-opacity"
      style={{ 
        backgroundColor: hexToRgba(lt.card_bg_color, Number(lt.card_bg_opacity)),
        borderLeft: `4px solid ${lt.date_box_color}`,
        color: lt.text_color
      }}
    >
      <div className="flex items-center gap-1.5 text-xs opacity-70 mb-0.5">
        <Clock className="w-3 h-3" />
        <span className="font-medium">{startTime}</span>
      </div>
      <div className="font-medium leading-tight line-clamp-2">{event.title}</div>
    </div>
  );
}

function MoreEventsButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="w-full text-center text-xs font-medium text-primary py-1.5 hover:bg-primary/10 transition-colors"
    >
      + ещё {count}
    </button>
  );
}

function DayEventsPopup({ 
  events, 
  date, 
  onEventClick, 
  onClose 
}: { 
  events: EventWithLessonType[]; 
  date: Date;
  onEventClick: (event: EventWithLessonType) => void; 
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center p-4 pt-16" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40" />
      <div className="relative bg-white w-full max-w-sm shadow-xl max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b p-3 font-semibold text-center">
          {format(date, 'd MMMM, EEEE', { locale: ru })}
        </div>
        <div className="p-3 space-y-2">
          {events.map(event => (
            <MobileEventItem 
              key={event.id} 
              event={event} 
              onClick={() => { onClose(); onEventClick(event); }} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function MobileCalendarView({ events, currentWeek, onWeekChange, onEventClick }: MobileCalendarViewProps) {
  const [expandedDay, setExpandedDay] = useState<{ date: Date; events: EventWithLessonType[] } | null>(null);
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

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

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

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-t">
          {weekDays.map((day, idx) => (
            <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* Week grid with swipe support */}
      <div 
        className="grid grid-cols-7"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {days.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDate.get(dateKey) || [];
          const isToday = isSameDay(day, new Date());
          const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
          const hiddenCount = dayEvents.length - MAX_VISIBLE_EVENTS;

          return (
            <div
              key={index}
              className="min-h-[120px] border-r border-b last:border-r-0 p-1.5 flex flex-col"
              onClick={() => dayEvents.length > 0 && setExpandedDay({ date: day, events: dayEvents })}
            >
              <div className={`text-sm font-semibold mb-1.5 w-7 h-7 flex items-center justify-center mx-auto ${
                isToday ? 'bg-primary text-primary-foreground' : ''
              }`}>
                {format(day, 'd')}
              </div>
              <div className="flex-1 space-y-1">
                {visibleEvents.map(event => (
                  <MobileEventItem
                    key={event.id}
                    event={event}
                    onClick={() => onEventClick(event)}
                  />
                ))}
                {hiddenCount > 0 && (
                  <MoreEventsButton 
                    count={hiddenCount} 
                    onClick={() => setExpandedDay({ date: day, events: dayEvents })}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day events popup */}
      {expandedDay && (
        <DayEventsPopup
          events={expandedDay.events}
          date={expandedDay.date}
          onEventClick={onEventClick}
          onClose={() => setExpandedDay(null)}
        />
      )}
    </div>
  );
}
