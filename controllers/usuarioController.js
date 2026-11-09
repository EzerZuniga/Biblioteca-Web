const bcrypt = require("bcrypt");
const { Usuario, Prestamo } = require("../models");
const { emailValido } = require("../utils/validar");
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

  if (nombre !== undefined) {
    if (!String(nombre).trim()) {
      throw new ErrorNegocio(400, "El nombre no puede estar vacío");
    }
    usuario.nombre = String(nombre).trim();
  }

  if (email !== undefined) {
    const emailNormal = String(email).trim().toLowerCase();
    if (!emailValido(emailNormal)) {
      throw new ErrorNegocio(400, "El email no tiene un formato válido");
    }
    if (emailNormal !== usuario.email) {
      const existe = await Usuario.findOne({ where: { email: emailNormal } });
      if (existe) throw new ErrorNegocio(409, "Ese email ya está en uso");
      usuario.email = emailNormal;
    }
  }

  if (rol !== undefined) {
    if (!["admin", "usuario"].includes(rol)) {
      throw new ErrorNegocio(400, "Rol no válido");
    }
    if (usuario.id === req.usuario.id && rol !== "admin") {
      throw new ErrorNegocio(
        400,
        "No puedes quitarte tu propio rol de administrador",
      );
    }
    usuario.rol = rol;
  }

  if (password) {
    if (String(password).length < 6) {
      throw new ErrorNegocio(
        400,
        "La contraseña debe tener al menos 6 caracteres",
      );
    }
    usuario.password = await bcrypt.hash(String(password), 10);
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
