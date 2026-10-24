-- Esquema SQL para MySQL 8.0
CREATE DATABASE IF NOT EXISTS estadistica_curso
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE estadistica_curso;

CREATE TABLE IF NOT EXISTS calculos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  tipo        VARCHAR(40)   NOT NULL,
  categoria   VARCHAR(40)   NOT NULL,
  titulo      VARCHAR(200)  NOT NULL,
  entrada     JSON          NOT NULL,
  resultado   JSON          NOT NULL,
  exito       TINYINT(1)    NOT NULL DEFAULT 1,
  creado_en   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_calculos_tipo (tipo),
  INDEX idx_calculos_creado (creado_en DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS conjuntos_datos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(120)  NOT NULL UNIQUE,
  descripcion VARCHAR(500)  NOT NULL DEFAULT '',
  datos       JSON          NOT NULL,
  creado_en   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
