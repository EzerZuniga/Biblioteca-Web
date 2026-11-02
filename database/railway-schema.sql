CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'usuario') NOT NULL DEFAULT 'usuario'
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS libros (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  autor VARCHAR(150) NOT NULL,
  categoria VARCHAR(100) NOT NULL DEFAULT 'General',
  cantidad INT NOT NULL DEFAULT 0,
  CHECK (cantidad >= 0)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS prestamos (
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
