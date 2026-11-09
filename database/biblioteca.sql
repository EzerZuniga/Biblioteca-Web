CREATE DATABASE IF NOT EXISTS biblioteca_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE biblioteca_db;
SET NAMES utf8mb4;
DROP TABLE IF EXISTS prestamos;
DROP TABLE IF EXISTS libros;
DROP TABLE IF EXISTS usuarios;
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'usuario') NOT NULL DEFAULT 'usuario',
  version_token INT NOT NULL DEFAULT 0
) ENGINE = InnoDB;
CREATE TABLE libros (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  autor VARCHAR(150) NOT NULL,
  categoria VARCHAR(100) NOT NULL DEFAULT 'General',
  cantidad INT NOT NULL DEFAULT 0,
  CHECK (cantidad >= 0)
) ENGINE = InnoDB;
CREATE TABLE prestamos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  libro_id INT NOT NULL,
  codigo VARCHAR(8) NOT NULL UNIQUE,
  fecha_prestamo DATE NULL,
  fecha_devolucion DATE NULL,
  estado ENUM('pendiente', 'prestado', 'devuelto') NOT NULL DEFAULT 'pendiente',
  CONSTRAINT fk_prestamos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_prestamos_libro FOREIGN KEY (libro_id) REFERENCES libros(id)
) ENGINE = InnoDB;
INSERT INTO libros (titulo, autor, categoria, cantidad)
VALUES (
    'Cien años de soledad',
    'Gabriel García Márquez',
    'Novela',
    5
  ),
  (
    'Los ríos profundos',
    'José María Arguedas',
    'Novela',
    3
  ),
  (
    'Conversación en La Catedral',
    'Mario Vargas Llosa',
    'Novela',
    2
  ),
  (
    'Don Quijote de la Mancha',
    'Miguel de Cervantes',
    'Clásicos',
    4
  ),
  (
    'Clean Code',
    'Robert C. Martin',
    'Programación',
    3
  ),
  (
    'JavaScript: The Good Parts',
    'Douglas Crockford',
    'Programación',
    2
  ),
  (
    'Fundamentos de bases de datos',
    'Abraham Silberschatz',
    'Bases de datos',
    4
  ),
  (
    'Breve historia del tiempo',
    'Stephen Hawking',
    'Ciencia',
    0
  );