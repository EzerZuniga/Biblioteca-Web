const { Op } = require("sequelize");
const { Libro, Prestamo } = require("../models");
const { Conflicto, buscarOFallar } = require("../utils/errors");
const {
  prestadosLiteral,
  contarPrestados,
  conDisponibles,
  transaccion,
} = require("./inventory");

// En LIKE, % y _ son comodines: se escapan para buscar el texto literal.
const escaparLike = (texto) => texto.replace(/[\\%_]/g, "\\$&");

const listar = async ({ titulo } = {}) => {
  const where = titulo
    ? { titulo: { [Op.like]: `%${escaparLike(titulo)}%` } }
    : {};
  const libros = await Libro.findAll({
    where,
    attributes: { include: [prestadosLiteral()] },
    order: [["titulo", "ASC"]],
  });
  return libros.map((libro) => conDisponibles(libro));
};

const crear = async (datos) => conDisponibles(await Libro.create(datos), 0);

const actualizar = (id, cambios) =>
  transaccion(async (t) => {
    const libro = await buscarOFallar(Libro, id, "Libro no encontrado", {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const prestados = await contarPrestados(libro.id, t);
    if (cambios.cantidad !== undefined && cambios.cantidad < prestados) {
      throw new Conflicto(
        `Hay ${prestados} ejemplares prestados. El total no puede ser menor que eso.`,
      );
    }

    libro.set(cambios);
    await libro.save({ transaction: t });
    return conDisponibles(libro, prestados);
  });

const eliminar = async (id) => {
  const libro = await buscarOFallar(Libro, id, "Libro no encontrado");

  const prestamos = await Prestamo.count({ where: { libro_id: libro.id } });
  if (prestamos > 0) {
    throw new Conflicto(
      "No se puede eliminar: el libro tiene préstamos registrados",
    );
  }

  await libro.destroy();
};

module.exports = { listar, crear, actualizar, eliminar };
