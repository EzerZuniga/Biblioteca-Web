require("dotenv").config({ quiet: true });
const { sequelize } = require("../models");
const migrar = require("../database/migrate");

migrar(sequelize)
  .then((hechas) => {
    if (!hechas.length) console.log("No hay migraciones pendientes.");
    hechas.forEach((archivo) => console.log(`Aplicada: ${archivo}`));
  })
  .catch((error) => {
    console.error("Falló la migración:", error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
