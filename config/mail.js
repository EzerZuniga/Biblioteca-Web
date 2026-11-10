// Configuración del correo saliente (Resend) y de los enlaces que se envían.
// Se lee al usarse, no al cargar el módulo, para respetar cambios de entorno.

const MINUTOS_ENLACE_RECUPERACION = 60;

const claveResend = () => process.env.RESEND_API_KEY || null;

// Mientras no verifiques tu dominio en Resend, onboarding@resend.dev solo
// puede enviar al email con el que creaste la cuenta de Resend.
const remitente = () =>
  process.env.CORREO_REMITENTE || "Biblioteca <onboarding@resend.dev>";

// Dirección pública de la app para armar los enlaces de los correos. Nunca se
// toma de la petición en producción: un atacante podría enviar otro "Host" y
// hacer que el enlace del correo apunte a su sitio.
const urlPublica = () => {
  if (process.env.URL_PUBLICA)
    return process.env.URL_PUBLICA.replace(/\/+$/, "");
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  return null;
};

const esProduccion = () =>
  process.env.NODE_ENV === "production" ||
  Boolean(process.env.RAILWAY_ENVIRONMENT);

module.exports = {
  MINUTOS_ENLACE_RECUPERACION,
  claveResend,
  remitente,
  urlPublica,
  esProduccion,
};
