// Auditoría y datos bibliográficos:
// 1. creado_en y actualizado_en en usuarios, libros y préstamos. En las filas
//    que ya existían quedan con la fecha de esta migración: la real no se sabe.
// 2. isbn (único), editorial y año en libros.
// 3. Tabla auditoria (si sequelize.sync() todavía no la creó).
// Cambia la estructura, así que cada paso revisa antes el estado actual.
exports.up = async ({ sequelize, transaction }) => {
  const consultar = (sql, replacements) =>
    sequelize
      .query(sql, { replacements, transaction })
      .then(([filas]) => filas);
  const ejecutar = (sql) => sequelize.query(sql, { transaction });

  const columnasDe = async (tabla) =>
    (
      await consultar(
        `SELECT COLUMN_NAME AS nombre FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [tabla],
      )
    ).map((c) => c.nombre);

  for (const tabla of ["usuarios", "libros", "prestamos"]) {
    const columnas = await columnasDe(tabla);
    if (!columnas.includes("creado_en")) {
      await ejecutar(
        `ALTER TABLE ${tabla}
           ADD COLUMN creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      );
    }
    if (!columnas.includes("actualizado_en")) {
      await ejecutar(
        `ALTER TABLE ${tabla}
           ADD COLUMN actualizado_en DATETIME NOT NULL
             DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
      );
    }
  }

  const columnasLibros = await columnasDe("libros");
  if (!columnasLibros.includes("isbn")) {
    await ejecutar(
      "ALTER TABLE libros ADD COLUMN isbn VARCHAR(13) NULL AFTER categoria",
    );
  }
  if (!columnasLibros.includes("editorial")) {
    await ejecutar(
      "ALTER TABLE libros ADD COLUMN editorial VARCHAR(150) NULL AFTER isbn",
    );
  }
  if (!columnasLibros.includes("anio")) {
    await ejecutar(
      "ALTER TABLE libros ADD COLUMN anio SMALLINT NULL AFTER editorial",
    );
  }
  const isbnUnico = await consultar(
    `SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'libros'
        AND COLUMN_NAME = 'isbn' AND NON_UNIQUE = 0`,
  );
  if (!isbnUnico.length) {
    await ejecutar("CREATE UNIQUE INDEX uq_libros_isbn ON libros (isbn)");
  }

  await ejecutar(`
    CREATE TABLE IF NOT EXISTS auditoria (
      id INT NOT NULL AUTO_INCREMENT,
      usuario_id INT NULL,
      accion VARCHAR(50) NOT NULL,
      entidad VARCHAR(30) NOT NULL,
      entidad_id INT NULL,
      detalles JSON NULL,
      creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_auditoria_entidad (entidad, entidad_id),
      KEY idx_auditoria_creado_en (creado_en),
      CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE = InnoDB`);
};
