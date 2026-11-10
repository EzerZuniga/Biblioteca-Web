const migrar = require("./migrate");
const seed = require("./seed");

// Crea solo las tablas que no existen. Las existentes no se tocan: ni
// columnas ni índices. sequelize.sync() sí agrega a una tabla existente los
// índices nuevos del modelo, y si un índice usa una columna que todavía no
// creó su migración, el arranque falla (pasó en producción con fecha_limite).
// Cambiar tablas existentes es trabajo exclusivo de las migraciones.
async function crearTablasFaltantes(sequelize) {
  const existentes = new Set(
    (await sequelize.getQueryInterface().showAllTables()).map((tabla) =>
      typeof tabla === "string" ? tabla : tabla.tableName,
    ),
  );
  // Primero las tablas a las que otras apuntan (usuarios antes que préstamos).
  const modelos = [];
  sequelize.modelManager.forEachModel((modelo) => modelos.push(modelo));
  for (const modelo of modelos) {
    if (!existentes.has(modelo.getTableName())) await modelo.sync();
  }
}

// Deja la base lista para la app: crea las tablas que falten, aplica las
// migraciones pendientes y, si se pide, carga los datos iniciales. Devuelve
// las migraciones aplicadas.
async function prepararBase(sequelize, { datosIniciales = true } = {}) {
  await sequelize.authenticate();
  await crearTablasFaltantes(sequelize);
  const aplicadas = await migrar(sequelize);
  if (datosIniciales) await seed();
  return aplicadas;
}

module.exports = prepararBase;
