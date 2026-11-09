require("dotenv").config({ quiet: true });
const bcrypt = require("bcrypt");
const { sequelize, Usuario } = require("../models");
const { emailValido } = require("../utils/validar");

const MIN_LARGO = 10;

const salir = (mensaje) => {
  console.error(mensaje);
  process.exit(1);
};

const contrasenaSegura = (clave) =>
  clave.length >= MIN_LARGO && /[a-zA-Z]/.test(clave) && /\d/.test(clave);

async function main() {
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "");
  const nombre = String(process.env.ADMIN_NOMBRE || "Administrador").trim();

  if (!email || !password) {
    salir(
      "Define ADMIN_EMAIL y ADMIN_PASSWORD como variables de entorno.\n" +
        "Opcional: ADMIN_NOMBRE.",
    );
  }
  if (!emailValido(email)) salir("ADMIN_EMAIL no tiene un formato válido.");
  if (!contrasenaSegura(password)) {
    salir(
      `ADMIN_PASSWORD debe tener al menos ${MIN_LARGO} caracteres, con letras y números.`,
    );
  }

  await sequelize.authenticate();
  const hash = await bcrypt.hash(password, 10);
  const existente = await Usuario.findOne({ where: { email } });

  if (existente) {
    existente.password = hash;
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
