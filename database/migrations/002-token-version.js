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
