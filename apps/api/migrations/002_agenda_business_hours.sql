-- Horario de apertura de la agenda: tramos horarios por día de la semana
-- (day_of_week: 0=domingo...6=sábado, igual que Date.getDay() en JS). Un día
-- sin ningún tramo se considera cerrado — no hace falta una columna
-- "enabled" aparte, la ausencia de filas ya lo representa.
CREATE TABLE IF NOT EXISTS agenda_business_hours (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week  INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS idx_agenda_business_hours_day ON agenda_business_hours(day_of_week);

-- Configuración general de la agenda (singleton, id siempre 1) — de momento
-- solo la duración de cada slot de la vista diaria.
CREATE TABLE IF NOT EXISTS agenda_config (
  id                    INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  slot_duration_minutes INT NOT NULL DEFAULT 30
);
INSERT INTO agenda_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
