// Antes, libros.cantidad guardaba los ejemplares disponibles y se restaba al
// aprobar un préstamo. Ahora guarda el total de ejemplares, y los disponibles
// se calculan. Para convertir los datos existentes se suman los ejemplares
// que están prestados en este momento.
exports.up = async ({ sequelize, transaction }) => {
  await sequelize.query(
    `UPDATE libros AS l
        SET l.cantidad = l.cantidad + (
          SELECT COUNT(*) FROM prestamos AS p
           WHERE p.libro_id = l.id AND p.estado = 'prestado'
        )`,
    { transaction },
  );
};
