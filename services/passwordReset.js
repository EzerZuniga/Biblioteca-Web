const crypto = require("crypto");
const { Op } = require("sequelize");
const { Usuario, Recuperacion } = require("../models");
const { SolicitudInvalida } = require("../utils/errors");
const { transaccion } = require("./transaction");
const { cifrar } = require("./users");
const auditoria = require("./audit");
const mailer = require("./mailer");
const { correoDeRecuperacion } = require("./emailTemplates");
const { MINUTOS_ENLACE_RECUPERACION } = require("../config/mail");
const logger = require("../utils/logger");

// No se reenvía un enlace si ya se pidió otro hace menos de esto: evita que
// alguien llene de correos la bandeja de otra persona.
const ESPERA_ENTRE_ENVIOS_MS = 2 * 60 * 1000;

const hashDe = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// Siempre termina igual, exista o no el email: quien pregunta no puede saber
// qué emails están registrados. El correo se envía sin esperar la respuesta de
// Resend, así la demora tampoco delata nada.
const solicitar = async (email, { urlBase }) => {
  if (!urlBase) {
    logger.error(
      "No se puede enviar el enlace de recuperación: define URL_PUBLICA",
    );
    return;
  }

  const usuario = await Usuario.findOne({ where: { email } });
  if (!usuario) return;

  const reciente = await Recuperacion.count({
    where: {
      usuario_id: usuario.id,
      usado_en: null,
      creado_en: { [Op.gt]: new Date(Date.now() - ESPERA_ENTRE_ENVIOS_MS) },
    },
  });
  if (reciente) return;

  const token = crypto.randomBytes(32).toString("base64url");
  await transaccion(async (t) => {
    // Pedir un enlace nuevo anula los anteriores.
    await Recuperacion.destroy({
      where: { usuario_id: usuario.id, usado_en: null },
      transaction: t,
    });
    await Recuperacion.create(
      {
        usuario_id: usuario.id,
        token_hash: hashDe(token),
        expira_en: new Date(Date.now() + MINUTOS_ENLACE_RECUPERACION * 60000),
      },
      { transaction: t },
    );
    await auditoria.registrar(
      {
        actorId: null,
        accion: "usuario.recuperacion_solicitada",
        entidad: "usuario",
        entidadId: usuario.id,
        detalles: { email },
      },
      t,
    );
  });

  const correo = correoDeRecuperacion({
    nombre: usuario.nombre,
    enlace: `${urlBase}/reset-password.html?token=${token}`,
    minutos: MINUTOS_ENLACE_RECUPERACION,
  });
  mailer
    .enviarCorreo({ para: usuario.email, ...correo })
    .catch((error) =>
      logger.error(
        { err: error, usuarioId: usuario.id },
        "No se pudo enviar el correo de recuperación",
      ),
    );
};

const restablecer = (token, password) =>
  transaccion(async (t) => {
    // El bloqueo evita que el mismo enlace se use dos veces a la vez.
    const enlace = await Recuperacion.findOne({
      where: {
        token_hash: hashDe(token),
        usado_en: null,
        expira_en: { [Op.gt]: new Date() },
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!enlace) {
      throw new SolicitudInvalida(
        "El enlace no es válido o ya venció. Pide uno nuevo.",
      );
    }

    const usuario = await Usuario.findByPk(enlace.usuario_id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    usuario.password = await cifrar(password);
    usuario.version_token += 1; // cierra todas las sesiones abiertas
    await usuario.save({ transaction: t });

    enlace.usado_en = new Date();
    await enlace.save({ transaction: t });
    await Recuperacion.destroy({
      where: { usuario_id: usuario.id, usado_en: null },
      transaction: t,
    });

    await auditoria.registrar(
      {
        actorId: usuario.id,
        accion: "usuario.contrasena_restablecida",
        entidad: "usuario",
        entidadId: usuario.id,
        detalles: { email: usuario.email },
      },
      t,
    );
  });

module.exports = { solicitar, restablecer, ESPERA_ENTRE_ENVIOS_MS };
