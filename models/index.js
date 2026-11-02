const sequelize = require('../config/db');
const Usuario = require('./Usuario');
const Libro = require('./Libro');
const Prestamo = require('./Prestamo');

// Relaciones: usuarios 1:N prestamos N:1 libros
Usuario.hasMany(Prestamo, { foreignKey: 'usuario_id' });
Libro.hasMany(Prestamo, { foreignKey: 'libro_id' });
Prestamo.belongsTo(Usuario, { foreignKey: 'usuario_id' });
Prestamo.belongsTo(Libro, { foreignKey: 'libro_id' });

module.exports = { sequelize, Usuario, Libro, Prestamo };