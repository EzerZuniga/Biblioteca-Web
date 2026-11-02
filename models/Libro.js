const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Libro = sequelize.define(
  "Libro",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    titulo: { type: DataTypes.STRING(200), allowNull: false },
    autor: { type: DataTypes.STRING(150), allowNull: false },
    categoria: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: "General",
    },
    cantidad: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { tableName: "libros", timestamps: false },
);

module.exports = Libro;
