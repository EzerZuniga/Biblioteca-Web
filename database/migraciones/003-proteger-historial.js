const RELACIONES = [
  { columna: "usuario_id", tabla: "usuarios", nombre: "fk_prestamos_usuario" },
  { columna: "libro_id", tabla: "libros", nombre: "fk_prestamos_libro" },
];

exports.up = async ({ sequelize, transaction }) => {
  const consultar = (sql, replacements) =>
    sequelize
      .query(sql, { replacements, transaction })
      .then(([filas]) => filas);

  for (const { columna, tabla, nombre } of RELACIONES) {
    const actuales = await consultar(
      `SELECT k.CONSTRAINT_NAME AS nombre, r.DELETE_RULE AS borrar
         FROM information_schema.KEY_COLUMN_USAGE k
         JOIN information_schema.REFERENTIAL_CONSTRAINTS r
           ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
          AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
        WHERE k.TABLE_SCHEMA = DATABASE()
          AND k.TABLE_NAME = 'prestamos'
          AND k.COLUMN_NAME = ?
          AND k.REFERENCED_TABLE_NAME = ?`,
      [columna, tabla],
    );
    const seguras = actuales.filter((fk) =>
      ["RESTRICT", "NO ACTION"].includes(fk.borrar),
    );
    if (seguras.length) continue;

    for (const fk of actuales) {
      await sequelize.query(
        `ALTER TABLE prestamos DROP FOREIGN KEY \`${fk.nombre}\``,
        { transaction },
      );
    }
    await sequelize.query(
      `ALTER TABLE prestamos ADD CONSTRAINT \`${nombre}\`
         FOREIGN KEY (${columna}) REFERENCES ${tabla}(id)
         ON DELETE RESTRICT ON UPDATE CASCADE`,
      { transaction },
    );
  }

  const checks = await consultar(
    `SELECT c.CHECK_CLAUSE AS regla
       FROM information_schema.TABLE_CONSTRAINTS t
       JOIN information_schema.CHECK_CONSTRAINTS c
         ON c.CONSTRAINT_SCHEMA = t.CONSTRAINT_SCHEMA
        AND c.CONSTRAINT_NAME = t.CONSTRAINT_NAME
      WHERE t.TABLE_SCHEMA = DATABASE()
        AND t.TABLE_NAME = 'libros'
        AND t.CONSTRAINT_TYPE = 'CHECK'`,
  );
  if (!checks.some((c) => /cantidad/.test(c.regla))) {
    await sequelize.query(
      "ALTER TABLE libros ADD CONSTRAINT chk_libros_cantidad CHECK (cantidad >= 0)",
      { transaction },
    );
  }
};
