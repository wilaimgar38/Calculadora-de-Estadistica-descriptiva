-- Esquema SQL de la calculadora de estadistica y probabilidad
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS calculos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo          TEXT    NOT NULL,   -- descriptiva | frecuencias | combinatoria | probabilidad
  categoria     TEXT    NOT NULL,   -- subtipo del calculo
  titulo        TEXT    NOT NULL,
  entrada       TEXT    NOT NULL,   -- JSON con los datos de entrada
  resultado     TEXT    NOT NULL,   -- JSON con el resultado
  exito         INTEGER NOT NULL DEFAULT 1,
  creado_en     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_calculos_tipo     ON calculos (tipo);
CREATE INDEX IF NOT EXISTS idx_calculos_creado_en ON calculos (creado_en DESC);

CREATE TABLE IF NOT EXISTS conjuntos_datos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre        TEXT    NOT NULL UNIQUE,
  descripcion   TEXT    DEFAULT '',
  datos         TEXT    NOT NULL,   -- JSON con la lista de numeros
  creado_en     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);
