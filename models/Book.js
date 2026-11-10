const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const MARCAS_DE_TIEMPO = require("./timestamps");

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
    // ISBN-10 o ISBN-13 sin guiones; único porque identifica una edición.
    isbn: { type: DataTypes.STRING(13), allowNull: true, unique: true },
    editorial: { type: DataTypes.STRING(150), allowNull: true },
    anio: { type: DataTypes.SMALLINT, allowNull: true },
    // Total de ejemplares. Los disponibles se calculan en services/inventory.js
    cantidad: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { tableName: "libros", ...MARCAS_DE_TIEMPO },
);

module.exports = Libro;
