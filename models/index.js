const sequelize = require("../config/db");
const Usuario = require("./User");
const Libro = require("./Book");
const Prestamo = require("./Loan");

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

module.exports = { sequelize, Usuario, Libro, Prestamo };
