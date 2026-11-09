require("dotenv").config({ quiet: true });
const logger = require("./utils/logger");

const faltantes = ["DB_NAME", "DB_USER", "JWT_SECRET"].filter(
  (nombre) => !process.env[nombre],
);
if (faltantes.length) {
  logger.fatal(
    { faltantes },
    "Faltan variables de entorno. Revisa tu archivo .env",
  );
  process.exit(1);
}

const app = require("./app");
const { sequelize } = require("./models");
const prepararBase = require("./database/prepare");
const { crearApagado } = require("./utils/shutdown");

// PORT=0 pide un puerto libre al sistema (lo usan los tests).
const PORT = Number(process.env.PORT ?? 3000);

// Un error que nadie capturó deja el proceso en un estado desconocido: mejor
// registrarlo y salir para que Railway levante uno limpio.
process.on("unhandledRejection", (motivo) => {
  logger.fatal({ err: motivo }, "Promesa rechazada sin manejar");
  process.exit(1);
});
process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Excepción no capturada");
  process.exit(1);
});

async function iniciar() {
  const aplicadas = await prepararBase(sequelize);
  for (const migracion of aplicadas) {
    logger.info({ migracion }, "Migración aplicada");
  }

  const servidor = app.listen(PORT, "0.0.0.0", () => {
    logger.info({ puerto: servidor.address().port }, "Servidor listo");
  });
  // Detrás del proxy de Railway las conexiones deben vivir más que en el
  // proxy; si no, este podría reutilizar una que el servidor ya cerró.
  servidor.keepAliveTimeout = 65_000;
  servidor.headersTimeout = 66_000;

  const apagar = crearApagado({ servidor, sequelize, logger });
  for (const senal of ["SIGTERM", "SIGINT"]) {
    process.once(senal, () =>
      apagar(senal).then((codigo) => process.exit(codigo)),
    );
  }
}

iniciar().catch((error) => {
  logger.fatal(
    { err: error },
    "No se pudo preparar la base de datos. Revisa tu archivo .env y que MySQL esté encendido",
  );
  process.exit(1);
});
