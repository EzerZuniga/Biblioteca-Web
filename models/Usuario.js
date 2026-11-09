const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Usuario = sequelize.define(
  'Usuario',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(255), allowNull: false }, // hash de bcrypt
    rol: { type: DataTypes.ENUM('admin', 'usuario'), allowNull: false, defaultValue: 'usuario' },
    // Sube al cambiar la contraseña; invalida los tokens emitidos antes.
    version_token: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { tableName: 'usuarios', timestamps: false }
);

module.exports = Usuario;