// Préstamos con fecha límite, rechazo y cancelación:
// 1. El estado admite "rechazado" y "cancelado".
// 2. Columnas fecha_limite y motivo_rechazo, más un índice para los vencidos.
// 3. Los préstamos que ya existían reciben su fecha límite a partir de su
//    fecha de préstamo.
// Cambia la estructura (MySQL no deshace un ALTER TABLE), así que cada paso
// revisa antes el estado actual y la migración se puede repetir sin daño.
const { DIAS_PRESTAMO } = require("../../config/loans");

const ESTADOS = "'pendiente','prestado','devuelto','rechazado','cancelado'";

exports.up = async ({ sequelize, transaction }) => {
  const consultar = (sql, replacements) =>
    sequelize
      .query(sql, { replacements, transaction })
      .then(([filas]) => filas);
  const ejecutar = (sql, replacements) =>
    sequelize.query(sql, { replacements, transaction });

  const columnas = await consultar(
    `SELECT COLUMN_NAME AS nombre, COLUMN_TYPE AS tipo
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prestamos'`,
  );
  const columna = (nombre) => columnas.find((c) => c.nombre === nombre);

  if (!columna("estado").tipo.includes("'cancelado'")) {
    await ejecutar(
      `ALTER TABLE prestamos MODIFY estado ENUM(${ESTADOS}) NOT NULL DEFAULT 'pendiente'`,
    );
  }
  if (!columna("fecha_limite")) {
    await ejecutar(
      "ALTER TABLE prestamos ADD COLUMN fecha_limite DATE NULL AFTER fecha_devolucion",
    );
  }
  if (!columna("motivo_rechazo")) {
    await ejecutar(
      "ALTER TABLE prestamos ADD COLUMN motivo_rechazo VARCHAR(255) NULL AFTER fecha_limite",
    );
  }

  const indices = await consultar(
    `SELECT DISTINCT INDEX_NAME AS nombre FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prestamos'`,
  );
  if (!indices.some((i) => i.nombre === "idx_prestamos_estado_limite")) {
    await ejecutar(
      "CREATE INDEX idx_prestamos_estado_limite ON prestamos (estado, fecha_limite)",
    );
  }

  await ejecutar(
    `UPDATE prestamos
        SET fecha_limite = DATE_ADD(fecha_prestamo, INTERVAL ? DAY)
      WHERE fecha_limite IS NULL AND fecha_prestamo IS NOT NULL`,
    [DIAS_PRESTAMO],
  );
};
