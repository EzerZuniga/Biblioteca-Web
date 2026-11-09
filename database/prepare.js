const migrar = require("./migrar");
const seed = require("./seed");

// Deja la base lista para la app: crea las tablas que falten (sin modificar
// las existentes), aplica las migraciones pendientes y, si se pide, carga los
// datos iniciales. Devuelve las migraciones aplicadas.
async function prepararBase(sequelize, { datosIniciales = true } = {}) {
  await sequelize.authenticate();
  await sequelize.sync();
  const aplicadas = await migrar(sequelize);
  if (datosIniciales) await seed();
  return aplicadas;
}

module.exports = prepararBase;
