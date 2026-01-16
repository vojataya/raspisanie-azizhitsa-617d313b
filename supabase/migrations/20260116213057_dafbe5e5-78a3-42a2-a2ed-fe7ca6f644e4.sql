-- Remove the label column from lesson_types table
-- The label will now be derived from name.toUpperCase() in the UI
ALTER TABLE public.lesson_types DROP COLUMN label;