const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Usuario } = require("../models");
const { emailValido } = require("../utils/validar");

exports.register = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res
        .status(400)
        .json({ mensaje: "Nombre, email y contraseña son obligatorios" });
    }
    const emailNormal = String(email).trim().toLowerCase();
    if (!emailValido(emailNormal)) {
      return res
        .status(400)
        .json({ mensaje: "El email no tiene un formato válido" });
    }
    if (String(password).length < 6) {
      return res
        .status(400)
        .json({ mensaje: "La contraseña debe tener al menos 6 caracteres" });
    }

    const existe = await Usuario.findOne({ where: { email: emailNormal } });
    if (existe) {
      return res.status(409).json({ mensaje: "Ese email ya está registrado" });
    }

    const hash = await bcrypt.hash(String(password), 10);

    const usuario = await Usuario.create({
      nombre: String(nombre).trim(),
      email: emailNormal,
      password: hash,
      rol: "usuario",
    });

    res.status(201).json({
      mensaje: "Cuenta creada correctamente",
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

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ mensaje: "Ingresa tu email y tu contraseña" });
    }

    const usuario = await Usuario.findOne({
      where: { email: String(email).trim().toLowerCase() },
    });
    const coincide =
      usuario && (await bcrypt.compare(String(password), usuario.password));

    if (!coincide) {
      return res
        .status(401)
        .json({ mensaje: "Email o contraseña incorrectos" });
    }

    const datos = { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol };
    const token = jwt.sign(
      { ...datos, v: usuario.version_token },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    res.json({ token, usuario: datos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
};

exports.yo = (req, res) => {
  const { id, nombre, rol } = req.usuario;
  res.json({ id, nombre, rol });
};
