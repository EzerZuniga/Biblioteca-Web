const bcrypt = require("bcrypt");
const { Usuario, Prestamo } = require("../models");
const {
  SolicitudInvalida,
  Conflicto,
  buscarOFallar,
} = require("../utils/errors");
const { paginar } = require("./pagination");
const { transaccion } = require("./transaction");
const auditoria = require("./audit");

const RONDAS_BCRYPT = 10;

const cifrar = (password) => bcrypt.hash(password, RONDAS_BCRYPT);

const verificarPassword = (password, hash) => bcrypt.compare(password, hash);

const exigirEmailLibre = async (
  email,
  mensaje = "Ese email ya está en uso",
  transaction,
) => {
  const existe = await Usuario.findOne({ where: { email }, transaction });
  if (existe) throw new Conflicto(mensaje);
};

const listar = (pagina = {}) =>
  paginar(
    Usuario,
    {
      attributes: { exclude: ["password", "version_token"] },
      order: [["id", "ASC"]],
    },
    pagina,
  );

const actualizar = (id, cambios, { actorId }) =>
  transaccion(async (t) => {
    const usuario = await buscarOFallar(Usuario, id, "Usuario no encontrado", {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const { nombre, email, rol, password } = cambios;
    const antes = usuario.datosPublicos();

    if (nombre !== undefined) usuario.nombre = nombre;

    if (email !== undefined && email !== usuario.email) {
      await exigirEmailLibre(email, undefined, t);
      usuario.email = email;
    }

    if (rol !== undefined) {
      if (usuario.id === actorId && rol !== "admin") {
        throw new SolicitudInvalida(
          "No puedes quitarte tu propio rol de administrador",
        );
      }
      usuario.rol = rol;
    }

    if (password !== undefined) {
      usuario.password = await cifrar(password);
      usuario.version_token += 1; // cierra las sesiones abiertas con la clave anterior
    }

    await usuario.save({ transaction: t });

    // La contraseña nunca se registra: solo que se cambió.
    const cambiados = auditoria.diferencias(antes, { nombre, email, rol });
    if (password !== undefined) cambiados.password = "cambiada";
    if (Object.keys(cambiados).length) {
      await auditoria.registrar(
        {
          actorId,
          accion: "usuario.actualizado",
          entidad: "usuario",
          entidadId: usuario.id,
          detalles: { email: usuario.email, cambios: cambiados },
        },
        t,
      );
    }
    return usuario.datosPublicos();
  });

const eliminar = (id, { actorId }) =>
  transaccion(async (t) => {
    const usuario = await buscarOFallar(Usuario, id, "Usuario no encontrado", {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (usuario.id === actorId) {
      throw new SolicitudInvalida("No puedes eliminar tu propia cuenta");
    }

    const prestamos = await Prestamo.count({
      where: { usuario_id: usuario.id },
      transaction: t,
    });
    if (prestamos > 0) {
      throw new Conflicto(
        "No se puede eliminar: el usuario tiene préstamos registrados",
      );
    }

    await usuario.destroy({ transaction: t });
    await auditoria.registrar(
      {
        actorId,
        accion: "usuario.eliminado",
        entidad: "usuario",
        entidadId: usuario.id,
        detalles: { nombre: usuario.nombre, email: usuario.email },
      },
      t,
    );
  });

// Crea el administrador o, si el email ya existe, le pone la clave nueva y el
// rol de admin. Lo usan la consola y el arranque, por eso el actor es el
// sistema. Devuelve "creado" o "actualizado".
const guardarAdmin = ({ nombre, email, password }, { cambiarNombre }) =>
  transaccion(async (t) => {
    const hash = await cifrar(password);
    let usuario = await Usuario.findOne({ where: { email }, transaction: t });
    const resultado = usuario ? "actualizado" : "creado";

    if (usuario) {
      usuario.password = hash;
      usuario.version_token += 1;
      usuario.rol = "admin";
      if (cambiarNombre) usuario.nombre = nombre;
      await usuario.save({ transaction: t });
    } else {
      usuario = await Usuario.create(
        { nombre, email, password: hash, rol: "admin" },
        { transaction: t },
      );
    }

    await auditoria.registrar(
      {
        actorId: null,
        accion: "usuario.admin_guardado",
        entidad: "usuario",
        entidadId: usuario.id,
        detalles: { email, resultado },
      },
      t,
    );
    return resultado;
  });

const hayAdmin = async () =>
  (await Usuario.count({ where: { rol: "admin" } })) > 0;

module.exports = {
  cifrar,
  verificarPassword,
  exigirEmailLibre,
  listar,
  actualizar,
  eliminar,
  guardarAdmin,
  hayAdmin,
};
