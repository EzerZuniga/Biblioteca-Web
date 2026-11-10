// Debe cargarse antes que cualquier módulo que use la base: fija el nombre de
// la base de pruebas antes de que config/db.js lo lea.
require("dotenv").config({ quiet: true });
const mysql = require("mysql2/promise");

// Sin logs durante los tests; LOG_LEVEL=info los muestra para depurar.
process.env.LOG_LEVEL ??= "silent";

const HOSTS_LOCALES = ["localhost", "127.0.0.1", "::1"];
const host = process.env.DB_HOST || "localhost";

// Los tests crean y borran bases de datos: nunca contra un servidor remoto
// por accidente, por ejemplo con un .env que apunte a Railway.
if (
  !HOSTS_LOCALES.includes(host) &&
  process.env.PERMITIR_BD_REMOTA_EN_TESTS !== "1"
) {
  throw new Error(
    `Los tests solo corren contra MySQL local y DB_HOST es "${host}". ` +
      "Si es intencional, define PERMITIR_BD_REMOTA_EN_TESTS=1.",
  );
}

// Un nombre por proceso: node --test corre cada archivo en su propio proceso.
const NOMBRE_BD = `biblioteca_test_${process.pid}`;
process.env.DB_NAME = NOMBRE_BD;
process.env.JWT_SECRET ||= "secreto-solo-para-tests";

const conectar = () =>
  mysql.createConnection({
    host,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    multipleStatements: true,
  });

const modelos = () => require("../../models");

async function crearBaseDePrueba({ preparar = true } = {}) {
  const cx = await conectar();
  await cx.query(`DROP DATABASE IF EXISTS \`${NOMBRE_BD}\``);
  await cx.query(`CREATE DATABASE \`${NOMBRE_BD}\` CHARACTER SET utf8mb4`);
  await cx.end();

  if (preparar) {
    const prepararBase = require("../../database/prepare");
    await prepararBase(modelos().sequelize, { datosIniciales: false });
  }
}

async function borrarBaseDePrueba() {
  await modelos().sequelize.close();
  const cx = await conectar();
  await cx.query(`DROP DATABASE IF EXISTS \`${NOMBRE_BD}\``);
  await cx.end();
}

// Deja las tablas vacías para que cada test empiece desde cero. El orden
// respeta las claves foráneas: primero los préstamos.
async function vaciarTablas() {
  const { sequelize } = modelos();
  for (const tabla of [
    "recuperaciones",
    "auditoria",
    "prestamos",
    "libros",
    "usuarios",
  ]) {
    await sequelize.query(`DELETE FROM ${tabla}`);
  }
}

const consultar = async (sql, replacements) => {
  const [filas] = await modelos().sequelize.query(sql, { replacements });
  return filas;
};

module.exports = {
  NOMBRE_BD,
  conectar,
  crearBaseDePrueba,
  borrarBaseDePrueba,
  vaciarTablas,
  consultar,
};
