const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Prestamo = sequelize.define(
  'Prestamo',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    libro_id: { type: DataTypes.INTEGER, allowNull: false },
    codigo: { type: DataTypes.STRING(8), allowNull: false, unique: true }, // generado con crypto
    fecha_prestamo: { type: DataTypes.DATEONLY, allowNull: true },
    fecha_devolucion: { type: DataTypes.DATEONLY, allowNull: true },
    estado: {
      type: DataTypes.ENUM('pendiente', 'prestado', 'devuelto'),
      allowNull: false,
      defaultValue: 'pendiente',
    },
  },
  { tableName: 'prestamos', timestamps: false }
);

module.exports = Prestamo;