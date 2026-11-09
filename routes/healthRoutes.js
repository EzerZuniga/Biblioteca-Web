const router = require("express").Router();
const { sequelize } = require("../models");
const { estaApagando } = require("../utils/serverState");
const { version } = require("../package.json");

const ESPERA_MAXIMA_MS = 3000;

const conLimite = (promesa, ms) =>
  Promise.race([
    promesa,
    new Promise((_, rechazar) =>
      setTimeout(() => rechazar(new Error("tiempo agotado")), ms).unref(),
    ),
  ]);

// Railway consulta esta ruta antes de pasarle tráfico a un despliegue nuevo.
// Responde 200 solo si la app puede atender: el proceso no se está apagando y
// la base de datos contesta. No expone detalles del error.
router.get("/health", async (req, res) => {
  res.set("Cache-Control", "no-store");
  const base = { version, activoDesdeSegundos: Math.round(process.uptime()) };

  if (estaApagando()) {
    return res.status(503).json({ ...base, estado: "apagando" });
  }
  try {
    await conLimite(sequelize.query("SELECT 1"), ESPERA_MAXIMA_MS);
    res.json({ ...base, estado: "ok", baseDeDatos: "ok" });
  } catch (error) {
    req.log?.error({ err: error }, "Healthcheck: la base no responde");
    res
      .status(503)
      .json({ ...base, estado: "error", baseDeDatos: "sin conexión" });
  }
});

module.exports = router;
