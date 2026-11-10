const logger = require("../utils/logger");
const { claveResend, remitente, esProduccion } = require("../config/mail");

const URL_RESEND = "https://api.resend.com/emails";
const ESPERA_MAXIMA_MS = 10000;

const enviarConResend = async ({ para, asunto, html, texto }) => {
  const respuesta = await fetch(URL_RESEND, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${claveResend()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: remitente(),
      to: [para],
      subject: asunto,
      html,
      text: texto,
    }),
    signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(
      `Resend respondió ${respuesta.status}: ${detalle.slice(0, 200)}`,
    );
  }
  return respuesta.json();
};

// Sin RESEND_API_KEY, en desarrollo el correo se muestra en la terminal para
// poder probar el flujo sin cuenta. En producción no se envía y queda el error
// en los logs: nunca se escriben enlaces secretos en los logs de producción.
const enviarCorreo = async (mensaje) => {
  if (claveResend()) return enviarConResend(mensaje);

  if (esProduccion()) {
    logger.error(
      { para: mensaje.para, asunto: mensaje.asunto },
      "No se envió el correo: falta configurar RESEND_API_KEY",
    );
    return null;
  }
  logger.warn(
    { para: mensaje.para, asunto: mensaje.asunto, contenido: mensaje.texto },
    "Correo no enviado (sin RESEND_API_KEY); se muestra aquí para desarrollo",
  );
  return null;
};

module.exports = { enviarCorreo };
