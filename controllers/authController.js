const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Usuario } = require("../models");
const { emailValido } = require("../utils/validar");
const { ErrorNegocio, capturarErrores } = require("../utils/errores");

const register = async (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    throw new ErrorNegocio(400, "Nombre, email y contraseña son obligatorios");
  }
  const emailNormal = String(email).trim().toLowerCase();
  if (!emailValido(emailNormal)) {
    throw new ErrorNegocio(400, "El email no tiene un formato válido");
  }
  if (String(password).length < 6) {
    throw new ErrorNegocio(
      400,
      "La contraseña debe tener al menos 6 caracteres",
    );
  }

  const existe = await Usuario.findOne({ where: { email: emailNormal } });
  if (existe) throw new ErrorNegocio(409, "Ese email ya está registrado");

  const usuario = await Usuario.create({
    nombre: String(nombre).trim(),
    email: emailNormal,
    password: await bcrypt.hash(String(password), 10),
    rol: "usuario",
  });

  res.status(201).json({
    mensaje: "Cuenta creada correctamente",
    usuario: usuario.datosPublicos(),
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ErrorNegocio(400, "Ingresa tu email y tu contraseña");
  }

  const usuario = await Usuario.findOne({
    where: { email: String(email).trim().toLowerCase() },
  });
  const coincide =
    usuario && (await bcrypt.compare(String(password), usuario.password));
  if (!coincide) throw new ErrorNegocio(401, "Email o contraseña incorrectos");

  const datos = { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol };
  const token = jwt.sign(
    { ...datos, v: usuario.version_token },
    process.env.JWT_SECRET,
    { expiresIn: "8h" },
  );

  res.json({ token, usuario: datos });
};

const yo = (req, res) => {
  const { id, nombre, rol } = req.usuario;
  res.json({ id, nombre, rol });
};

module.exports = capturarErrores({ register, login, yo });
