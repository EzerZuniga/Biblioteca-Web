const bcrypt = require("bcrypt");
const { Usuario, Prestamo } = require("../models");
const {
  SolicitudInvalida,
  Conflicto,
  buscarOFallar,
} = require("../utils/errores");

const RONDAS_BCRYPT = 10;

const cifrar = (password) => bcrypt.hash(password, RONDAS_BCRYPT);

const verificarPassword = (password, hash) => bcrypt.compare(password, hash);

const exigirEmailLibre = async (email, mensaje = "Ese email ya está en uso") => {
  const existe = await Usuario.findOne({ where: { email } });
  if (existe) throw new Conflicto(mensaje);
};

const listar = () =>
  Usuario.findAll({
    attributes: { exclude: ["password", "version_token"] },
    order: [["id", "ASC"]],
  });

const actualizar = async (id, cambios, { actorId }) => {
  const usuario = await buscarOFallar(Usuario, id, "Usuario no encontrado");
  const { nombre, email, rol, password } = cambios;

  if (nombre !== undefined) usuario.nombre = nombre;

  if (email !== undefined && email !== usuario.email) {
    await exigirEmailLibre(email);
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

  await usuario.save();
  return usuario.datosPublicos();
};

const eliminar = async (id, { actorId }) => {
  const usuario = await buscarOFallar(Usuario, id, "Usuario no encontrado");
  if (usuario.id === actorId) {
    throw new SolicitudInvalida("No puedes eliminar tu propia cuenta");
  }

  const prestamos = await Prestamo.count({ where: { usuario_id: usuario.id } });
  if (prestamos > 0) {
    throw new Conflicto(
      "No se puede eliminar: el usuario tiene préstamos registrados",
    );
  }

  await usuario.destroy();
};

// Crea el administrador o, si el email ya existe, le pone la clave nueva y el
// rol de admin. Devuelve "creado" o "actualizado".
const guardarAdmin = async ({ nombre, email, password }, { cambiarNombre }) => {
  const hash = await cifrar(password);
  const existente = await Usuario.findOne({ where: { email } });

  if (!existente) {
    await Usuario.create({ nombre, email, password: hash, rol: "admin" });
    return "creado";
  }

  existente.password = hash;
  existente.version_token += 1;
  existente.rol = "admin";
  if (cambiarNombre) existente.nombre = nombre;
  await existente.save();
  return "actualizado";
};

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
