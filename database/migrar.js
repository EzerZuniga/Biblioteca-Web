const fs = require("fs");
const path = require("path");

const CARPETA = path.join(__dirname, "migraciones");
const CANDADO = "biblioteca_migraciones";

// Aplica en orden las migraciones de database/migraciones que aún no se
// ejecutaron y las registra en la tabla "migraciones".
//
// Un candado con nombre de MySQL (GET_LOCK) asegura que solo un proceso migre
// a la vez: si arrancan dos instancias, la segunda espera y luego ve que ya no
// queda nada pendiente. Cada migración corre en una transacción y se registra
// al final, solo si terminó bien. Las que cambian estructura deben revisar el
// estado antes de cada paso, porque MySQL no deshace un ALTER TABLE.
async function migrar(sequelize) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS migraciones (
      nombre VARCHAR(150) PRIMARY KEY,
      aplicada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE = InnoDB`);

  // La transacción solo sirve para reservar una conexión: GET_LOCK pertenece a
  // la conexión que lo pidió y debe liberarse desde la misma.
  const sesion = await sequelize.transaction();
  const hechas = [];
  try {
    const [[candado]] = await sequelize.query(
      "SELECT GET_LOCK(?, 120) AS ok",
      { replacements: [CANDADO], transaction: sesion },
    );
    if (Number(candado.ok) !== 1) {
      throw new Error("Otro proceso lleva más de 2 minutos migrando la base");
    }

    try {
      const [filas] = await sequelize.query("SELECT nombre FROM migraciones");
      const aplicadas = new Set(filas.map((fila) => fila.nombre));
      const pendientes = fs
        .readdirSync(CARPETA)
        .filter((archivo) => archivo.endsWith(".js") && !aplicadas.has(archivo))
        .sort();

      for (const archivo of pendientes) {
        const migracion = require(path.join(CARPETA, archivo));
        await sequelize.transaction(async (transaction) => {
          await migracion.up({ sequelize, transaction });
          await sequelize.query("INSERT INTO migraciones (nombre) VALUES (?)", {
            replacements: [archivo],
            transaction,
          });
        });
        hechas.push(archivo);
      }
    } finally {
      await sequelize.query("SELECT RELEASE_LOCK(?)", {
        replacements: [CANDADO],
        transaction: sesion,
      });
    }
  } finally {
    await sesion.commit();
  }
  return hechas;
}

module.exports = migrar;
