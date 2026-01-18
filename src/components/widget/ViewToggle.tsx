import { LayoutGrid, CalendarDays } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export type ViewMode = 'tile' | 'calendar';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as ViewMode)}
      className="border"
    >
      <ToggleGroupItem value="tile" aria-label="Режим плитки" className="gap-2">
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden sm:inline">Плитка</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="calendar" aria-label="Режим календаря" className="gap-2">
        <CalendarDays className="w-4 h-4" />
        <span className="hidden sm:inline">Календарь</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
