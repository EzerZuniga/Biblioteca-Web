const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const MARCAS_DE_TIEMPO = require("./timestamps");

// "vencido" no es un estado guardado: es un préstamo "prestado" cuya
// fecha_limite ya pasó. Se calcula al consultar, así nunca queda desactualizado.
const ESTADOS = ["pendiente", "prestado", "devuelto", "rechazado", "cancelado"];

const Prestamo = sequelize.define(
  "Prestamo",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    libro_id: { type: DataTypes.INTEGER, allowNull: false },
    codigo: { type: DataTypes.STRING(8), allowNull: false, unique: true }, // generado con crypto
    fecha_prestamo: { type: DataTypes.DATEONLY, allowNull: true },
    fecha_devolucion: { type: DataTypes.DATEONLY, allowNull: true },
    fecha_limite: { type: DataTypes.DATEONLY, allowNull: true },
    motivo_rechazo: { type: DataTypes.STRING(255), allowNull: true },
    estado: {
      type: DataTypes.ENUM(...ESTADOS),
      allowNull: false,
      defaultValue: "pendiente",
    },
  },
  {
    tableName: "prestamos",
    ...MARCAS_DE_TIEMPO,
    indexes: [
      // Para encontrar rápido los préstamos vencidos.
      {
        name: "idx_prestamos_estado_limite",
        fields: ["estado", "fecha_limite"],
      },
    ],
  },
);

Prestamo.ESTADOS = ESTADOS;

module.exports = Prestamo;
