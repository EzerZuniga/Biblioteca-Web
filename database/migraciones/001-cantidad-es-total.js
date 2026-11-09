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
