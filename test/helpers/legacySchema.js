// Estructura y datos del sistema anterior, tal como los creó sequelize.sync()
// en Railway antes de las migraciones. Sirve para probar que una base real de
// producción se actualiza bien.
const ESQUEMA_ANTIGUO = `
  CREATE TABLE usuarios (
    id int NOT NULL AUTO_INCREMENT, nombre varchar(100) NOT NULL,
    email varchar(150) NOT NULL, password varchar(255) NOT NULL,
    rol enum('admin','usuario') NOT NULL DEFAULT 'usuario',
    PRIMARY KEY (id), UNIQUE KEY email (email)) ENGINE=InnoDB;
  CREATE TABLE libros (
    id int NOT NULL AUTO_INCREMENT, titulo varchar(200) NOT NULL,
    autor varchar(150) NOT NULL, categoria varchar(100) NOT NULL DEFAULT 'General',
    cantidad int NOT NULL DEFAULT '0', PRIMARY KEY (id)) ENGINE=InnoDB;
  CREATE TABLE prestamos (
    id int NOT NULL AUTO_INCREMENT, usuario_id int NOT NULL, libro_id int NOT NULL,
    codigo varchar(8) NOT NULL, fecha_prestamo date DEFAULT NULL,
    fecha_devolucion date DEFAULT NULL,
    estado enum('pendiente','prestado','devuelto') NOT NULL DEFAULT 'pendiente',
    PRIMARY KEY (id), UNIQUE KEY codigo (codigo),
    CONSTRAINT prestamos_ibfk_1 FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT prestamos_ibfk_2 FOREIGN KEY (libro_id) REFERENCES libros (id)
      ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB;

  -- Antes "cantidad" eran los disponibles: el libro 1 tiene 3 ejemplares,
  -- 1 prestado, y guardaba 2.
  INSERT INTO usuarios (id, nombre, email, password) VALUES (1, 'Lector', 'l@x.com', 'x');
  INSERT INTO libros (id, titulo, autor, cantidad) VALUES (1, 'Con préstamo', 'A', 2), (2, 'Sin préstamo', 'B', 4);
  INSERT INTO prestamos (usuario_id, libro_id, codigo, estado, fecha_prestamo)
    VALUES (1, 1, 'AAAA0001', 'prestado', '2026-01-01'),
           (1, 2, 'AAAA0002', 'devuelto', NULL);`;

module.exports = { ESQUEMA_ANTIGUO };
