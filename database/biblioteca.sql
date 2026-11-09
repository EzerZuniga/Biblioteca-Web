-- Crea la base de datos vacía. No borra nada: si ya existe, no hace nada.
--
-- Las tablas, los cambios de estructura y los libros de ejemplo los crea la
-- app al arrancar (sequelize.sync, database/migraciones y database/seed.js).
-- Así hay una sola fuente de verdad para el esquema y no se desincroniza.
CREATE DATABASE IF NOT EXISTS biblioteca_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
