export interface LessonType {
  id: string;
  name: string;
  card_bg_color: string;
  card_bg_opacity: number;
  date_box_color: string;
  text_color: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  image_url: string | null;
  lesson_type_id: string;
  mode: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  description_short: string | null;
  description_full: string | null;
  teacher: string | null;
  schedule: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventWithLessonType extends Event {
  lesson_type: LessonType;
}

export interface WidgetSettings {
  id: string;
  show_past_events: boolean;
  max_events: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}
