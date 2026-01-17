import * as React from "react";
import { format, parse, setHours, setMinutes } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateTimePickerProps {
  value: string; // ISO string or datetime-local format
  onChange: (value: string) => void;
  placeholder?: string;
  minDate?: Date;
  defaultDate?: Date; // Default date when opening empty picker
}

// Generate hours 0-23
const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));

// Generate minutes in 5-minute intervals
const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0"));

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Выберите дату и время",
  minDate,
  defaultDate,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Parse the value to Date
  const dateValue = React.useMemo(() => {
    if (!value) return undefined;
    try {
      // Handle both ISO and datetime-local formats
      const date = new Date(value);
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  }, [value]);

  // When opening picker, use defaultDate if no value
  const displayDate = dateValue || defaultDate;

  const selectedHour = dateValue ? format(dateValue, "HH") : "";
  const selectedMinute = dateValue 
    ? (Math.round(dateValue.getMinutes() / 5) * 5).toString().padStart(2, "0")
    : "";

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    // Keep existing time or use default
    const hour = dateValue ? dateValue.getHours() : (defaultDate?.getHours() ?? 12);
    const minute = dateValue 
      ? Math.round(dateValue.getMinutes() / 5) * 5 
      : (defaultDate ? Math.round(defaultDate.getMinutes() / 5) * 5 : 0);
    
    const newDate = setMinutes(setHours(date, hour), minute);
    onChange(formatForInput(newDate));
  };

  const handleHourChange = (hour: string) => {
    const base = dateValue || defaultDate || new Date();
    const newDate = setHours(base, parseInt(hour, 10));
    onChange(formatForInput(newDate));
  };

  const handleMinuteChange = (minute: string) => {
    const base = dateValue || defaultDate || new Date();
    const newDate = setMinutes(base, parseInt(minute, 10));
    onChange(formatForInput(newDate));
  };

  // Format for datetime-local input compatibility
  const formatForInput = (date: Date): string => {
    return format(date, "yyyy-MM-dd'T'HH:mm");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !dateValue && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateValue ? (
            format(dateValue, "d MMMM yyyy, HH:mm", { locale: ru })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={handleDateSelect}
            defaultMonth={displayDate}
            disabled={minDate ? (date) => date < minDate : undefined}
            initialFocus
            className="p-3 pointer-events-auto"
            locale={ru}
          />
          <div className="border-l p-3 flex flex-col gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              <span>Время</span>
            </div>
            <div className="flex gap-2">
              <Select value={selectedHour} onValueChange={handleHourChange}>
                <SelectTrigger className="w-[70px]">
                  <SelectValue placeholder="ЧЧ" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {hours.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="flex items-center text-xl">:</span>
              <Select value={selectedMinute} onValueChange={handleMinuteChange}>
                <SelectTrigger className="w-[70px]">
                  <SelectValue placeholder="ММ" />
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
