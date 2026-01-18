import { useMemo, useRef, TouchEvent } from 'react';
import { EventWithLessonType } from '@/types/database';
import { parseISO, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export type CalendarMode = 'month' | 'week';

interface CalendarViewProps {
  events: EventWithLessonType[];
  currentMonth: Date;
  currentWeek: Date;
  calendarMode: CalendarMode;
  onMonthChange: (date: Date) => void;
  onWeekChange: (date: Date) => void;
  onModeChange: (mode: CalendarMode) => void;
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

export function CalendarView({ 
  events, 
  currentMonth, 
  currentWeek,
  calendarMode,
  onMonthChange, 
  onWeekChange,
  onModeChange,
  onEventClick 
}: CalendarViewProps) {
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Month view data
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Week view data
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weekDayHeaders = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const weekDaysFull = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

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

  // Swipe handling for week view
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
      if (calendarMode === 'week') {
        if (diff > 0) {
          onWeekChange(addWeeks(currentWeek, 1));
        } else {
          onWeekChange(subWeeks(currentWeek, 1));
        }
      } else {
        if (diff > 0) {
          onMonthChange(addMonths(currentMonth, 1));
        } else {
          onMonthChange(subMonths(currentMonth, 1));
        }
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div className="bg-white shadow-lg min-h-0">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white border-b">
        <div className="flex items-center justify-between p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => calendarMode === 'month' 
              ? onMonthChange(subMonths(currentMonth, 1)) 
              : onWeekChange(subWeeks(currentWeek, 1))
            }
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold capitalize">
              {calendarMode === 'month' ? monthYearLabel : weekLabel}
            </h2>
            
            <ToggleGroup 
              type="single" 
              value={calendarMode} 
              onValueChange={(value) => value && onModeChange(value as CalendarMode)}
              className="border rounded-md"
            >
              <ToggleGroupItem value="month" aria-label="Месяц" className="text-xs px-3">
                Месяц
              </ToggleGroupItem>
              <ToggleGroupItem value="week" aria-label="Неделя" className="text-xs px-3">
                Неделя
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => calendarMode === 'month' 
              ? onMonthChange(addMonths(currentMonth, 1)) 
              : onWeekChange(addWeeks(currentWeek, 1))
            }
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Weekday headers - only for month view */}
        {calendarMode === 'month' && (
          <div className="grid grid-cols-7 border-t">
            {weekDayHeaders.map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Calendar content */}
      {calendarMode === 'month' ? (
        /* Month grid */
        <div className="grid grid-cols-7 auto-rows-min">
          {monthDays.map((day, index) => {
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
      ) : (
        /* Vertical week list */
        <div 
          className="divide-y"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {weekDays.map((day, index) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate.get(dateKey) || [];
            const isToday = isSameDay(day, new Date());
            const dayNumber = format(day, 'd');

            return (
              <div key={index} className="p-4">
                {/* Day header */}
                <div className="flex items-center gap-4 mb-3">
                  <div className={`w-12 h-12 flex items-center justify-center font-bold text-xl ${
                    isToday ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                  }`}>
                    {dayNumber}
                  </div>
                  <div>
                    <div className="font-medium">{weekDaysFull[index]}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(day, 'd MMMM yyyy', { locale: ru })}
                    </div>
                  </div>
                </div>

                {/* Events list */}
                {dayEvents.length > 0 ? (
                  <div className="space-y-2 ml-16">
                    {dayEvents.map(event => (
                      <WeekEventItem
                        key={event.id}
                        event={event}
                        onClick={() => onEventClick(event)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground ml-16 py-2">
                    Нет событий
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
