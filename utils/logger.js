const pino = require("pino");

// En Railway la salida no es una terminal: los logs salen en JSON, una línea
// por evento, fáciles de filtrar. En desarrollo se ven legibles con colores.
const legible =
  process.env.NODE_ENV !== "production" &&
  process.stdout.isTTY &&
  (() => {
    try {
      return Boolean(require.resolve("pino-pretty"));
    } catch {
      return false;
    }
  })();

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  // Nunca registrar credenciales, aunque lleguen en un objeto logueado.
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.token",
    ],
    censor: "[oculto]",
  },
  ...(legible && {
    transport: {
      target: "pino-pretty",
      options: { translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" },
    },
  }),
});

module.exports = logger;
