const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");

// Cabeceras de seguridad: política de contenido (solo scripts propios),
// protección contra clickjacking, HSTS, sin cabecera X-Powered-By, etc.
// upgrade-insecure-requests se desactiva porque rompe el desarrollo en
// http://localhost; en Railway todo ya se sirve por HTTPS.
const cabeceras = helmet({
  contentSecurityPolicy: {
    directives: { upgradeInsecureRequests: null },
  },
});

const limite = ({ minutos, maximo, mensaje, ...extra }) =>
  rateLimit({
    windowMs: minutos * 60 * 1000,
    limit: maximo,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res, next, opciones) =>
      res.status(opciones.statusCode).json({ mensaje }),
    ...extra,
  });

// Solo cuentan los intentos fallidos: quien entra bien no gasta intentos.
const limiteLogin = limite({
  minutos: 15,
  maximo: 10,
  skipSuccessfulRequests: true,
  mensaje:
    "Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo.",
});

const limiteRegistro = limite({
  minutos: 60,
  maximo: 5,
  mensaje:
    "Se crearon demasiadas cuentas desde esta conexión. Inténtalo en una hora.",
});

// Pedir enlaces de recuperación envía correos: pocos por hora y por conexión.
const limiteRecuperacion = limite({
  minutos: 60,
  maximo: 5,
  mensaje:
    "Pediste demasiados enlaces desde esta conexión. Inténtalo en una hora.",
});

const limiteRestablecimiento = limite({
  minutos: 15,
  maximo: 10,
  mensaje: "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.",
});

// Límite general de la API para frenar abusos y scripts descontrolados.
const limiteApi = limite({
  minutos: 1,
  maximo: 300,
  mensaje: "Demasiadas peticiones. Espera un momento e inténtalo de nuevo.",
});

module.exports = {
  cabeceras,
  limiteLogin,
  limiteRegistro,
  limiteRecuperacion,
  limiteRestablecimiento,
  limiteApi,
};
