const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Enlaces para restablecer la contraseña. Se guarda solo el hash SHA-256 del
// token: si alguien lee la base, no puede usar los enlaces pendientes.
const Recuperacion = sequelize.define(
  "Recuperacion",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    token_hash: { type: DataTypes.CHAR(64), allowNull: false, unique: true },
    expira_en: { type: DataTypes.DATE, allowNull: false },
    usado_en: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "recuperaciones",
    timestamps: true,
    createdAt: "creado_en",
    updatedAt: false,
  },
);

module.exports = Recuperacion;
