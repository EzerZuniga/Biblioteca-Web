// Tabla de enlaces para restablecer la contraseña (si sequelize.sync()
// todavía no la creó). Al eliminar un usuario se borran sus enlaces.
exports.up = async ({ sequelize, transaction }) => {
  await sequelize.query(
    `CREATE TABLE IF NOT EXISTS recuperaciones (
       id INT NOT NULL AUTO_INCREMENT,
       usuario_id INT NOT NULL,
       token_hash CHAR(64) NOT NULL,
       expira_en DATETIME NOT NULL,
       usado_en DATETIME NULL,
       creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
       PRIMARY KEY (id),
       UNIQUE KEY uq_recuperaciones_token (token_hash),
       KEY idx_recuperaciones_usuario (usuario_id),
       CONSTRAINT fk_recuperaciones_usuario FOREIGN KEY (usuario_id)
         REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
     ) ENGINE = InnoDB`,
    { transaction },
  );
};
