import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

const MONTHS_SHORT: Record<number, string> = {
  0: 'ЯНВ.',
  1: 'ФЕВ.',
  2: 'МАР.',
  3: 'АПР.',
  4: 'МАЙ',
  5: 'ИЮН.',
  6: 'ИЮЛ.',
  7: 'АВГ.',
  8: 'СЕН.',
  9: 'ОКТ.',
  10: 'НОЯ.',
  11: 'ДЕК.'
};

export function formatMonthShort(date: Date): string {
  return MONTHS_SHORT[date.getMonth()];
}

export function formatDay(date: Date): string {
  return format(date, 'd');
}

export function formatTime(date: Date): string {
  return format(date, 'HH:mm');
}

export function formatTimeRange(startAt: string, endAt: string): string {
  const start = parseISO(startAt);
  const end = parseISO(endAt);
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function formatFullDate(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, 'd MMMM yyyy', { locale: ru });
}

export function formatFullDateTime(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, 'd MMMM yyyy, HH:mm', { locale: ru });
}

export function isPastEvent(startAt: string): boolean {
  return parseISO(startAt) < new Date();
}

export function generateICSFile(event: {
  title: string;
  start_at: string;
  end_at: string;
  location?: string | null;
  description?: string | null;
}): string {
  const formatICSDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    return format(date, "yyyyMMdd'T'HHmmss");
  };

  const escapeICS = (str: string) => {
    return str.replace(/[\\;,\n]/g, (match) => {
      if (match === '\n') return '\\n';
      return '\\' + match;
    });
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Calligraphy School SPB//Schedule Widget//RU',
    'BEGIN:VEVENT',
    `DTSTART:${formatICSDate(event.start_at)}`,
    `DTEND:${formatICSDate(event.end_at)}`,
    `SUMMARY:${escapeICS(event.title)}`,
  ];

  if (event.location) {
    lines.push(`LOCATION:${escapeICS(event.location)}`);
  }

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n');
}

export function downloadICSFile(event: {
  title: string;
  start_at: string;
  end_at: string;
  location?: string | null;
  description?: string | null;
}) {
  const icsContent = generateICSFile(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
