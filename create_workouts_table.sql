-- Criar tabela workouts no banco Turso (LibSQL)
-- Esta tabela armazena entradas de treino com modalidade, duração, calorias queimadas e timestamp

-- Tabela principal
CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  modality TEXT NOT NULL,           -- Tipo de treino (ex: "musculação", "cardio", "HIIT")
  duration_min INTEGER NOT NULL,        -- Duração em minutos
  calories INTEGER NOT NULL,           -- Calorias estimadas queimadas
  logged_at TEXT NOT NULL DEFAULT (datetime('now', '-3 hours'))  -- Timestamp ajustado (-3h para Natal/RN)
);

-- Índice para queries por data
CREATE INDEX IF NOT EXISTS idx_workouts_logged_at ON workouts(logged_at);

-- Trigger para garantir que logged_at use timezone correto (-3 horas)
CREATE TRIGGER IF NOT EXISTS trg_workouts_insert
AFTER INSERT ON workouts
BEGIN
  UPDATE workouts SET logged_at = datetime('now', '-3 hours') WHERE id = NEW.id;
END;

-- Trigger para garantir timezone em updates (se necessário)
CREATE TRIGGER IF NOT EXISTS trg_workouts_update
AFTER UPDATE ON workouts
BEGIN
  UPDATE workouts SET logged_at = datetime('now', '-3 hours') WHERE id = NEW.id;
END;
