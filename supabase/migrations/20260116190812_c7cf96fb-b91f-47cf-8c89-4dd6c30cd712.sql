-- Таблица профилей администраторов (связана с auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Таблица видов занятий
CREATE TABLE public.lesson_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  card_bg_color TEXT NOT NULL DEFAULT '#E8D5B7',
  card_bg_opacity NUMERIC(3,2) NOT NULL DEFAULT 0.95,
  date_box_color TEXT NOT NULL DEFAULT '#D4A574',
  text_color TEXT NOT NULL DEFAULT '#2C1810',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Таблица событий
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT,
  lesson_type_id UUID NOT NULL REFERENCES public.lesson_types(id) ON DELETE RESTRICT,
  mode TEXT,
  location TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  description_short TEXT,
  description_full TEXT,
  teacher TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Таблица настроек виджета (одна запись)
CREATE TABLE public.widget_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_past_events BOOLEAN NOT NULL DEFAULT false,
  max_events INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Вставляем дефолтные настройки виджета
INSERT INTO public.widget_settings (id, show_past_events, max_events)
VALUES (gen_random_uuid(), false, 20);

-- Вставляем дефолтные виды занятий
INSERT INTO public.lesson_types (name, label, card_bg_color, card_bg_opacity, date_box_color, text_color, is_default)
VALUES 
  ('Курс', 'КУРС', '#E8D5B7', 0.95, '#D4A574', '#2C1810', true),
  ('Мастер-класс', 'МАСТЕР-КЛАСС', '#D5E8E8', 0.95, '#74A5A5', '#1A2C2C', false),
  ('Курс для взрослых', 'КУРС ДЛЯ ВЗРОСЛЫХ', '#E8D5E8', 0.95, '#A574A5', '#2C1A2C', false);

-- Функция проверки админа
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Функция обновления updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Триггеры для updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lesson_types_updated_at
  BEFORE UPDATE ON public.lesson_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_widget_settings_updated_at
  BEFORE UPDATE ON public.widget_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Функция автоматического создания профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'admin');
  RETURN NEW;
END;
$$;

-- Триггер на создание нового пользователя
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Включаем RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_settings ENABLE ROW LEVEL SECURITY;

-- RLS политики для profiles
CREATE POLICY "Admins can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS политики для lesson_types
CREATE POLICY "Admins can manage lesson types"
  ON public.lesson_types FOR ALL
  USING (public.is_admin());

CREATE POLICY "Public can view lesson types"
  ON public.lesson_types FOR SELECT
  USING (true);

-- RLS политики для events
CREATE POLICY "Admins can manage all events"
  ON public.events FOR ALL
  USING (public.is_admin());

CREATE POLICY "Public can view published events"
  ON public.events FOR SELECT
  USING (is_published = true);

-- RLS политики для widget_settings
CREATE POLICY "Admins can manage widget settings"
  ON public.widget_settings FOR ALL
  USING (public.is_admin());

CREATE POLICY "Public can view widget settings"
  ON public.widget_settings FOR SELECT
  USING (true);

-- Storage bucket для изображений событий
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true);

-- RLS политики для storage
CREATE POLICY "Public can view event images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-images');

CREATE POLICY "Admins can upload event images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'event-images' AND public.is_admin());

CREATE POLICY "Admins can update event images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'event-images' AND public.is_admin());

CREATE POLICY "Admins can delete event images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'event-images' AND public.is_admin());

-- Индексы для производительности
CREATE INDEX idx_events_start_at ON public.events(start_at);
CREATE INDEX idx_events_is_published ON public.events(is_published);
CREATE INDEX idx_events_lesson_type_id ON public.events(lesson_type_id);