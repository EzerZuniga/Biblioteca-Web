CREATE DATABASE IF NOT EXISTS biblioteca_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE biblioteca_db;
SET NAMES utf8mb4;

-- Se borran en orden inverso por las llaves foráneas
DROP TABLE IF EXISTS prestamos;
DROP TABLE IF EXISTS libros;
DROP TABLE IF EXISTS usuarios;

-- 1. usuarios
CREATE TABLE usuarios (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(100) NOT NULL,
  email     VARCHAR(150) NOT NULL UNIQUE,
  password  VARCHAR(255) NOT NULL,              -- hash de bcrypt
  rol       ENUM('admin','usuario') NOT NULL DEFAULT 'usuario'
) ENGINE=InnoDB;

-- 2. libros
CREATE TABLE libros (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  titulo     VARCHAR(200) NOT NULL,
  autor      VARCHAR(150) NOT NULL,
  categoria  VARCHAR(100) NOT NULL DEFAULT 'General',
  cantidad   INT NOT NULL DEFAULT 0,
  CHECK (cantidad >= 0)
) ENGINE=InnoDB;

-- 3. prestamos (relación N:M entre usuarios y libros, resuelta con esta tabla)
CREATE TABLE prestamos (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id        INT NOT NULL,
  libro_id          INT NOT NULL,
  codigo            VARCHAR(8) NOT NULL UNIQUE,  -- generado con crypto, ej: A7F3C91D
  fecha_prestamo    DATE NULL,                   -- se llena al aprobar
  fecha_devolucion  DATE NULL,                   -- se llena al devolver
  estado            ENUM('pendiente','prestado','devuelto') NOT NULL DEFAULT 'pendiente',
  CONSTRAINT fk_prestamos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_prestamos_libro   FOREIGN KEY (libro_id)   REFERENCES libros(id)
) ENGINE=InnoDB;

-- =====================================================
--  Datos iniciales
--  Admin:   admin@biblioteca.com    / Admin123
--  Usuario: usuario@biblioteca.com  / Usuario123
-- =====================================================
INSERT INTO usuarios (nombre, email, password, rol) VALUES
  ('Administrador', 'admin@biblioteca.com',   '$2b$10$l4w0llj4wahBQvlW4NK6WO/LIavEx0.RSgSg6sMkeVpNu.kDmVkJW', 'admin'),
  ('Usuario de prueba', 'usuario@biblioteca.com', '$2b$10$lYcQAD.IZsmqGONX1eW9lOnsYG9/PWYs0v3itJd.Q03sLfmeq7mye',  'usuario');

INSERT INTO libros (titulo, autor, categoria, cantidad) VALUES
  ('Cien años de soledad', 'Gabriel García Márquez', 'Novela', 5),
  ('Los ríos profundos', 'José María Arguedas', 'Novela', 3),
  ('Conversación en La Catedral', 'Mario Vargas Llosa', 'Novela', 2),
  ('Don Quijote de la Mancha', 'Miguel de Cervantes', 'Clásicos', 4),
  ('Clean Code', 'Robert C. Martin', 'Programación', 3),
  ('JavaScript: The Good Parts', 'Douglas Crockford', 'Programación', 2),
  ('Fundamentos de bases de datos', 'Abraham Silberschatz', 'Bases de datos', 4),
  ('Breve historia del tiempo', 'Stephen Hawking', 'Ciencia', 0);