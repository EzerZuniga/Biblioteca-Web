const sequelize = require("../config/db");
const Usuario = require("./User");
const Libro = require("./Book");
const Prestamo = require("./Loan");
const Auditoria = require("./AuditEntry");
const Recuperacion = require("./PasswordReset");

// RESTRICT: la base nunca borra préstamos en cascada. Un usuario o un libro con
// historial de préstamos no se puede eliminar, ni por la app ni a mano.
const relacion = (foreignKey) => ({
  foreignKey,
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});

Usuario.hasMany(Prestamo, relacion("usuario_id"));
Libro.hasMany(Prestamo, relacion("libro_id"));
Prestamo.belongsTo(Usuario, relacion("usuario_id"));
Prestamo.belongsTo(Libro, relacion("libro_id"));

// El registro de actividad sobrevive aunque se elimine a quien la hizo.
Auditoria.belongsTo(Usuario, {
  as: "actor",
  foreignKey: "usuario_id",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

// Los enlaces de recuperación no tienen sentido sin su usuario.
Usuario.hasMany(Recuperacion, {
  foreignKey: "usuario_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Recuperacion.belongsTo(Usuario, {
  foreignKey: "usuario_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

module.exports = {
  sequelize,
  Usuario,
  Libro,
  Prestamo,
  Auditoria,
  Recuperacion,
};
