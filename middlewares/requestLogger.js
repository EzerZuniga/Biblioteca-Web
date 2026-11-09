const crypto = require("crypto");
const pinoHttp = require("pino-http");
const logger = require("../utils/logger");

// Cada petición recibe un identificador que aparece en sus logs y vuelve en la
// cabecera X-Request-Id: con él se encuentra en los logs lo que vio un usuario.
const ID_VALIDO = /^[\w-]{1,64}$/;

const registrarPeticiones = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const recibido = req.headers["x-request-id"];
    const id = ID_VALIDO.test(recibido ?? "") ? recibido : crypto.randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  // Solo la API: los archivos estáticos y el healthcheck serían ruido.
  autoLogging: { ignore: (req) => !req.url.startsWith("/api/") },
  customLogLevel: (req, res, error) => {
    if (error || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});

module.exports = registrarPeticiones;
