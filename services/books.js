const { Op } = require("sequelize");
const { Libro, Prestamo } = require("../models");
const { Conflicto, buscarOFallar } = require("../utils/errors");
const {
  prestadosLiteral,
  contarPrestados,
  conDisponibles,
} = require("./inventory");
const { transaccion } = require("./transaction");
const { paginar } = require("./pagination");
const auditoria = require("./audit");
const { normalizarIsbn } = require("../utils/isbn");

// En LIKE, % y _ son comodines: se escapan para buscar el texto literal.
const escaparLike = (texto) => texto.replace(/[\\%_]/g, "\\$&");
const contiene = (texto) => ({ [Op.like]: `%${escaparLike(texto)}%` });

const condicionDeBusqueda = ({ buscar, titulo }) => {
  if (buscar) {
    const isbn = normalizarIsbn(buscar);
    return {
      [Op.or]: [
        { titulo: contiene(buscar) },
        { autor: contiene(buscar) },
        ...(/^[\dX]+$/.test(isbn) ? [{ isbn: contiene(isbn) }] : []),
      ],
    };
  }
  return titulo ? { titulo: contiene(titulo) } : {};
};

const listar = async ({ buscar, titulo, ...pagina } = {}) => {
  const resultado = await paginar(
    Libro,
    {
      where: condicionDeBusqueda({ buscar, titulo }),
      attributes: { include: [prestadosLiteral()] },
      order: [
        ["titulo", "ASC"],
        ["id", "ASC"],
      ],
    },
    pagina,
  );
  return {
    ...resultado,
    datos: resultado.datos.map((libro) => conDisponibles(libro)),
  };
};

const exigirIsbnLibre = async (isbn, idPropio, transaction) => {
  if (!isbn) return;
  const otro = await Libro.findOne({ where: { isbn }, transaction });
  if (otro && otro.id !== idPropio) {
    throw new Conflicto(`Ya existe un libro con ese ISBN: «${otro.titulo}»`);
  }
};

const crear = (datos, { actorId } = {}) =>
  transaccion(async (t) => {
    await exigirIsbnLibre(datos.isbn, null, t);
    const libro = await Libro.create(datos, { transaction: t });
    await auditoria.registrar(
      {
        actorId,
        accion: "libro.creado",
        entidad: "libro",
        entidadId: libro.id,
        detalles: { titulo: libro.titulo },
      },
      t,
    );
    return conDisponibles(libro, 0);
  });

const actualizar = (id, cambios, { actorId } = {}) =>
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
    await exigirIsbnLibre(cambios.isbn, libro.id, t);

    const antes = libro.toJSON();
    libro.set(cambios);
    await libro.save({ transaction: t });

    const cambiados = auditoria.diferencias(antes, cambios);
    if (Object.keys(cambiados).length) {
      await auditoria.registrar(
        {
          actorId,
          accion: "libro.actualizado",
          entidad: "libro",
          entidadId: libro.id,
          detalles: { titulo: libro.titulo, cambios: cambiados },
        },
        t,
      );
    }
    return conDisponibles(libro, prestados);
  });

const eliminar = (id, { actorId } = {}) =>
  transaccion(async (t) => {
    const libro = await buscarOFallar(Libro, id, "Libro no encontrado", {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const prestamos = await Prestamo.count({
      where: { libro_id: libro.id },
      transaction: t,
    });
    if (prestamos > 0) {
      throw new Conflicto(
        "No se puede eliminar: el libro tiene préstamos registrados",
      );
    }

    await libro.destroy({ transaction: t });
    await auditoria.registrar(
      {
        actorId,
        accion: "libro.eliminado",
        entidad: "libro",
        entidadId: libro.id,
        detalles: { titulo: libro.titulo, isbn: libro.isbn },
      },
      t,
    );
  });

module.exports = { listar, crear, actualizar, eliminar };
