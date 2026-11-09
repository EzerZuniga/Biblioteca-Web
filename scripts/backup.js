require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { marcaLocal } = require("../utils/dates");

// Genera un respaldo completo de la base con mysqldump en la carpeta backups/.
// Usa las mismas variables DB_* de la app. Para respaldar Railway, define esas
// variables con los datos de conexión pública de su servicio MySQL.

const CANDIDATOS = [
  process.env.MYSQLDUMP_PATH,
  "mysqldump",
  "C:/Program Files/MySQL/MySQL Server 8.4/bin/mysqldump.exe",
  "C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqldump.exe",
].filter(Boolean);

const mysqldump = CANDIDATOS.find(
  (ruta) => !spawnSync(ruta, ["--version"]).error,
);
if (!mysqldump) {
  console.error(
    "No se encontró mysqldump. Instala MySQL o define MYSQLDUMP_PATH con su ruta.",
  );
  process.exit(1);
}

const {
  DB_HOST = "localhost",
  DB_PORT = "3306",
  DB_USER,
  DB_PASS,
  DB_NAME,
} = process.env;
if (!DB_USER || !DB_NAME) {
  console.error("Faltan DB_USER o DB_NAME en el entorno.");
  process.exit(1);
}

const carpeta = path.join(__dirname, "..", "backups");
fs.mkdirSync(carpeta, { recursive: true });
const archivo = path.join(carpeta, `${DB_NAME}-${marcaLocal()}.sql`);

const resultado = spawnSync(
  mysqldump,
  [
    `--host=${DB_HOST}`,
    `--port=${DB_PORT}`,
    `--user=${DB_USER}`,
    "--single-transaction", // copia consistente sin bloquear la app
    "--routines",
    "--triggers",
    "--no-tablespaces",
    "--set-gtid-purged=OFF",
    "--default-character-set=utf8mb4",
    `--result-file=${archivo}`, // evita la redirección de PowerShell, que cambia la codificación
    DB_NAME,
  ],
  // La contraseña va por variable de entorno para que no aparezca en la lista de procesos.
  { env: { ...process.env, MYSQL_PWD: DB_PASS || "" }, encoding: "utf8" },
);

if (resultado.status !== 0) {
  fs.rmSync(archivo, { force: true });
  console.error("Falló el respaldo:\n" + (resultado.stderr || resultado.error));
  process.exit(1);
}
const kb = Math.round(fs.statSync(archivo).size / 1024);
console.log(`Respaldo creado: ${archivo} (${kb} KB)`);
