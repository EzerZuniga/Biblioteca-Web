const { Transaction } = require("sequelize");
const { sequelize, Prestamo } = require("../models");

// En libros, "cantidad" es el total de ejemplares que tiene la biblioteca.
// Los disponibles no se guardan: se calculan restando los préstamos activos.
// Así no existe un contador que se pueda desincronizar.

const PRESTADOS_SQL =
  "(SELECT COUNT(*) FROM prestamos AS p WHERE p.libro_id = `Libro`.`id` AND p.estado = 'prestado')";

const prestadosLiteral = () => [sequelize.literal(PRESTADOS_SQL), "prestados"];

const contarPrestados = (libroId, transaction) =>
  Prestamo.count({
    where: { libro_id: libroId, estado: "prestado" },
    transaction,
  });

const conDisponibles = (libro, prestados) => {
  const datos = libro.toJSON();
  datos.prestados = Number(prestados ?? datos.prestados ?? 0);
  datos.disponibles = Math.max(datos.cantidad - datos.prestados, 0);
  return datos;
};

// READ COMMITTED hace que el conteo vea los préstamos confirmados por otras
// transacciones después de obtener el bloqueo de la fila del libro.
const transaccion = (fn) =>
  sequelize.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED },
    fn,
  );

module.exports = {
  prestadosLiteral,
  contarPrestados,
  conDisponibles,
  transaccion,
};
