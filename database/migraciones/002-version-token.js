// Agrega usuarios.version_token. Cada token guarda la versión vigente al
// iniciar sesión; al cambiar la contraseña la versión sube y los tokens
// anteriores dejan de servir. En una base nueva la columna ya la crea
// sequelize.sync(), por eso primero se revisa si existe.
exports.up = async ({ sequelize, transaction }) => {
  const [filas] = await sequelize.query(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'usuarios'
        AND COLUMN_NAME = 'version_token'`,
    { transaction },
  );
  if (Number(filas[0].n) > 0) return;

  await sequelize.query(
    "ALTER TABLE usuarios ADD COLUMN version_token INT NOT NULL DEFAULT 0",
    { transaction },
  );
};
