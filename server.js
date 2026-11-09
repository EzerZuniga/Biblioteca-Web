require("dotenv").config({ quiet: true });

const faltantes = ["DB_NAME", "DB_USER", "JWT_SECRET"].filter(
  (nombre) => !process.env[nombre],
);
if (faltantes.length) {
  console.error(
    `Faltan variables de entorno: ${faltantes.join(", ")}. Revisa tu archivo .env`,
  );
  process.exit(1);
}

const app = require("./aplicacion");
const { sequelize } = require("./models");
const prepararBase = require("./database/preparar");

const PORT = process.env.PORT || 3000;

prepararBase(sequelize)
  .then((aplicadas) => {
    aplicadas.forEach((m) => console.log(`Migración aplicada: ${m}`));
    console.log("Conectado a MySQL");
    app.listen(PORT, "0.0.0.0", () =>
      console.log(`Servidor listo en http://0.0.0.0:${PORT}`),
    );
  })
  .catch((error) => {
    console.error(
      "No se pudo preparar la base de datos. Revisa tu archivo .env, que MySQL esté encendido y el error de abajo.",
    );
    console.error(error.message);
    process.exit(1);
  });
