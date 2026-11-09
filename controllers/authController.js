const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Usuario } = require("../models");
const { ErrorNegocio, capturarErrores } = require("../utils/errores");

const register = async (req, res) => {
  const { nombre, email, password } = req.body;

  const existe = await Usuario.findOne({ where: { email } });
  if (existe) throw new ErrorNegocio(409, "Ese email ya está registrado");

  const usuario = await Usuario.create({
    nombre,
    email,
    password: await bcrypt.hash(password, 10),
    rol: "usuario",
  });

  res.status(201).json({
    mensaje: "Cuenta creada correctamente",
    usuario: usuario.datosPublicos(),
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const usuario = await Usuario.findOne({ where: { email } });
  const coincide = usuario && (await bcrypt.compare(password, usuario.password));
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
