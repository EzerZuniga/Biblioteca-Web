const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Registro de actividad: quién hizo qué y cuándo. Solo se agregan filas,
// nunca se editan ni borran. "detalles" guarda lo necesario para entender la
// acción aunque el libro o el usuario se eliminen después.
const Auditoria = sequelize.define(
  "Auditoria",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    // Quién la hizo; null si fue el sistema (por ejemplo, la consola).
    usuario_id: { type: DataTypes.INTEGER, allowNull: true },
    accion: { type: DataTypes.STRING(50), allowNull: false },
    entidad: { type: DataTypes.STRING(30), allowNull: false },
    entidad_id: { type: DataTypes.INTEGER, allowNull: true },
    detalles: { type: DataTypes.JSON, allowNull: true },
  },
  {
    tableName: "auditoria",
    timestamps: true,
    createdAt: "creado_en",
    updatedAt: false,
    indexes: [
      { name: "idx_auditoria_entidad", fields: ["entidad", "entidad_id"] },
      { name: "idx_auditoria_creado_en", fields: ["creado_en"] },
    ],
  },
);

module.exports = Auditoria;
