const bcrypt = require("bcrypt");
const { Usuario, Prestamo } = require("../models");
const {
  ErrorNegocio,
  buscarOFallar,
  capturarErrores,
} = require("../utils/errores");

const listar = async (req, res) => {
  const usuarios = await Usuario.findAll({
    attributes: { exclude: ["password", "version_token"] },
    order: [["id", "ASC"]],
  });
  res.json(usuarios);
};

const actualizar = async (req, res) => {
  const usuario = await buscarOFallar(
    Usuario,
    req.params.id,
    "Usuario no encontrado",
  );
  const { nombre, email, rol, password } = req.body;

  if (nombre !== undefined) usuario.nombre = nombre;

  if (email !== undefined && email !== usuario.email) {
    const existe = await Usuario.findOne({ where: { email } });
    if (existe) throw new ErrorNegocio(409, "Ese email ya está en uso");
    usuario.email = email;
  }

  if (rol !== undefined) {
    if (usuario.id === req.usuario.id && rol !== "admin") {
      throw new ErrorNegocio(
        400,
        "No puedes quitarte tu propio rol de administrador",
      );
    }
    usuario.rol = rol;
  }

  if (password !== undefined) {
    usuario.password = await bcrypt.hash(password, 10);
    usuario.version_token += 1; // cierra las sesiones abiertas con la clave anterior
  }

  await usuario.save();
  res.json({ mensaje: "Usuario actualizado", usuario: usuario.datosPublicos() });
};

const eliminar = async (req, res) => {
  const usuario = await buscarOFallar(
    Usuario,
    req.params.id,
    "Usuario no encontrado",
  );
  if (usuario.id === req.usuario.id) {
    throw new ErrorNegocio(400, "No puedes eliminar tu propia cuenta");
  }

  const prestamos = await Prestamo.count({ where: { usuario_id: usuario.id } });
  if (prestamos > 0) {
    throw new ErrorNegocio(
      409,
      "No se puede eliminar: el usuario tiene préstamos registrados",
    );
  }

  await usuario.destroy();
  res.json({ mensaje: "Usuario eliminado" });
};

module.exports = capturarErrores({ listar, actualizar, eliminar });
