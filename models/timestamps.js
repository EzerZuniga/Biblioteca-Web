// Todas las tablas guardan cuándo se creó y cuándo se modificó cada fila.
// Sequelize llena las dos columnas solo, al crear y al guardar.
module.exports = {
  timestamps: true,
  createdAt: "creado_en",
  updatedAt: "actualizado_en",
};
