const bcrypt = require("bcrypt");
const { Usuario, Prestamo } = require("../models");
const { emailValido } = require("../utils/validar");

exports.listar = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      attributes: { exclude: ["password"] },
      order: [["id", "ASC"]],
    });
    res.json(usuarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario)
      return res.status(404).json({ mensaje: "Usuario no encontrado" });

    const { nombre, email, rol, password } = req.body;

    if (nombre !== undefined) {
      if (!String(nombre).trim())
        return res
          .status(400)
          .json({ mensaje: "El nombre no puede estar vacío" });
      usuario.nombre = String(nombre).trim();
    }

    if (email !== undefined) {
      const emailNormal = String(email).trim().toLowerCase();
      if (!emailValido(emailNormal))
        return res
          .status(400)
          .json({ mensaje: "El email no tiene un formato válido" });
      if (emailNormal !== usuario.email) {
        const existe = await Usuario.findOne({ where: { email: emailNormal } });
        if (existe)
          return res.status(409).json({ mensaje: "Ese email ya está en uso" });
        usuario.email = emailNormal;
      }
    }

    if (rol !== undefined) {
      if (!["admin", "usuario"].includes(rol))
        return res.status(400).json({ mensaje: "Rol no válido" });
      if (usuario.id === req.usuario.id && rol !== "admin") {
        return res
          .status(400)
          .json({
            mensaje: "No puedes quitarte tu propio rol de administrador",
          });
      }
      usuario.rol = rol;
    }

    if (password) {
      if (String(password).length < 6)
        return res
          .status(400)
          .json({ mensaje: "La contraseña debe tener al menos 6 caracteres" });
      usuario.password = await bcrypt.hash(String(password), 10);
    }

    await usuario.save();
    res.json({
      mensaje: "Usuario actualizado",
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario)
      return res.status(404).json({ mensaje: "Usuario no encontrado" });

    if (usuario.id === req.usuario.id) {
      return res
        .status(400)
        .json({ mensaje: "No puedes eliminar tu propia cuenta" });
    }

    const prestamos = await Prestamo.count({
      where: { usuario_id: usuario.id },
    });
    if (prestamos > 0) {
      return res
        .status(409)
        .json({
          mensaje:
            "No se puede eliminar: el usuario tiene préstamos registrados",
        });
    }

    await usuario.destroy();
    res.json({ mensaje: "Usuario eliminado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
};
