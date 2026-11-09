require("dotenv").config({ quiet: true });
const { sequelize } = require("../models");
const { adminDesdeEntorno } = require("../validators/users");
const { guardarAdmin } = require("../services/users");

const salir = (mensaje) => {
  console.error(mensaje);
  process.exit(1);
};

async function main() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    salir(
      "Define ADMIN_EMAIL y ADMIN_PASSWORD como variables de entorno.\n" +
        "Opcional: ADMIN_NOMBRE.",
    );
  }
  const resultado = adminDesdeEntorno();
  if (!resultado.success) salir(`${resultado.error.issues[0].message}.`);

  await sequelize.authenticate();
  const accion = await guardarAdmin(resultado.data, {
    cambiarNombre: Boolean(process.env.ADMIN_NOMBRE),
  });
  console.log(`Administrador ${accion}: ${resultado.data.email}`);
}

main()
  .catch((error) => {
    console.error("No se pudo crear el administrador:", error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
