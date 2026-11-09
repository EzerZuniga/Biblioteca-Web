const fs = require("fs");
const path = require("path");

const CARPETA = path.join(__dirname, "migraciones");

// Aplica en orden las migraciones de database/migraciones que aún no se
// ejecutaron. Cada una queda registrada en la tabla "migraciones", así que
// llamar a esta función varias veces es seguro.
async function migrar(sequelize) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS migraciones (
      nombre VARCHAR(150) PRIMARY KEY,
      aplicada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE = InnoDB`);

  const [filas] = await sequelize.query("SELECT nombre FROM migraciones");
  const aplicadas = new Set(filas.map((fila) => fila.nombre));
  const pendientes = fs
    .readdirSync(CARPETA)
    .filter((archivo) => archivo.endsWith(".js") && !aplicadas.has(archivo))
    .sort();

  const hechas = [];
  for (const archivo of pendientes) {
    const migracion = require(path.join(CARPETA, archivo));
    try {
      // El registro va primero: si dos procesos arrancan a la vez, el segundo
      // espera, choca con la clave primaria y no aplica la migración dos veces.
      await sequelize.transaction(async (transaction) => {
        await sequelize.query("INSERT INTO migraciones (nombre) VALUES (?)", {
          replacements: [archivo],
          transaction,
        });
        await migracion.up({ sequelize, transaction });
      });
      hechas.push(archivo);
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") continue;
      throw error;
    }
  }
  return hechas;
}

module.exports = migrar;
