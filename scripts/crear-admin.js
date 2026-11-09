require("dotenv").config({ quiet: true });
const bcrypt = require("bcrypt");
const { sequelize, Usuario } = require("../models");
const { adminDesdeEntorno } = require("../validaciones/usuarios");

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
  const { nombre, email, password } = resultado.data;

  await sequelize.authenticate();
  const hash = await bcrypt.hash(password, 10);
  const existente = await Usuario.findOne({ where: { email } });

  if (existente) {
    existente.password = hash;
    existente.version_token += 1; // cierra las sesiones abiertas con la clave anterior
    existente.rol = "admin";
    if (process.env.ADMIN_NOMBRE) existente.nombre = nombre;
    await existente.save();
    console.log(`Administrador actualizado: ${email}`);
  } else {
    await Usuario.create({ nombre, email, password: hash, rol: "admin" });
    console.log(`Administrador creado: ${email}`);
  }
}

main()
  .catch((error) => {
    console.error("No se pudo crear el administrador:", error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
