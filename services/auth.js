const jwt = require("jsonwebtoken");
const { Usuario } = require("../models");
const { NoAutenticado } = require("../utils/errors");
const { cifrar, verificarPassword, exigirEmailLibre } = require("./users");
const { DURACION_SESION_SEGUNDOS } = require("../config/session");
const { transaccion } = require("./transaction");
const auditoria = require("./audit");

const registrar = ({ nombre, email, password }) =>
  transaccion(async (t) => {
    await exigirEmailLibre(email, "Ese email ya está registrado", t);

    const usuario = await Usuario.create(
      { nombre, email, password: await cifrar(password), rol: "usuario" },
      { transaction: t },
    );
    await auditoria.registrar(
      {
        actorId: usuario.id,
        accion: "usuario.registrado",
        entidad: "usuario",
        entidadId: usuario.id,
        detalles: { email },
      },
      t,
    );
    return usuario.datosPublicos();
  });

const iniciarSesion = async ({ email, password }) => {
  const usuario = await Usuario.findOne({ where: { email } });
  const coincide =
    usuario && (await verificarPassword(password, usuario.password));
  if (!coincide) throw new NoAutenticado("Email o contraseña incorrectos");

  const datos = { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol };
  const token = jwt.sign(
    { ...datos, v: usuario.version_token },
    process.env.JWT_SECRET,
    { expiresIn: DURACION_SESION_SEGUNDOS },
  );
  return { token, usuario: datos };
};

// El token solo prueba quién es el usuario. El rol y la validez de la sesión
// se leen de la base en cada petición, así un cambio de rol, un borrado o un
// cambio de contraseña se aplican de inmediato y no cuando expire el token.
const sesionDesdeToken = async (token) => {
  if (!token) throw new NoAutenticado("Debes iniciar sesión");

  let datos;
  try {
    datos = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new NoAutenticado("Tu sesión expiró. Inicia sesión de nuevo");
  }

  const usuario = await Usuario.findByPk(datos.id, {
    attributes: ["id", "nombre", "email", "rol", "version_token"],
  });
  if (!usuario || (datos.v ?? 0) !== usuario.version_token) {
    throw new NoAutenticado(
      "Tu sesión ya no es válida. Inicia sesión de nuevo",
    );
  }
  return usuario.datosPublicos();
};

module.exports = { registrar, iniciarSesion, sesionDesdeToken };
