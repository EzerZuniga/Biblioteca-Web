const { marcarApagando } = require("./serverState");

// Railway envía SIGTERM antes de reemplazar el contenedor en cada despliegue.
// Apagar en orden evita cortar peticiones a la mitad: se deja de aceptar
// conexiones nuevas, se espera a las que están en curso y se cierra la base.
// Si algo se cuelga, se fuerza la salida pasado el tiempo máximo.
function crearApagado({ servidor, sequelize, logger, tiempoMaximoMs = 10000 }) {
  let enCurso = null;

  return function apagar(motivo) {
    if (enCurso) return enCurso;
    marcarApagando();
    logger.info({ motivo }, "Apagando el servidor");

    const forzar = setTimeout(() => {
      logger.error("El apagado tardó demasiado; se fuerza la salida");
      process.exit(1);
    }, tiempoMaximoMs);
    forzar.unref();

    enCurso = new Promise((resolver) => {
      servidor.close(resolver);
      // Las conexiones keep-alive sin peticiones activas se cierran ya.
      servidor.closeIdleConnections?.();
    })
      .then(() => sequelize.close())
      .then(() => {
        clearTimeout(forzar);
        logger.info("Servidor detenido");
        return 0;
      })
      .catch((error) => {
        clearTimeout(forzar);
        logger.error({ err: error }, "Error al apagar el servidor");
        return 1;
      });
    return enCurso;
  };
}

module.exports = { crearApagado };
