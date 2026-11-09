const { ErrorNegocio } = require("../utils/errores");

const rutaNoEncontrada = (req, res) => {
  res.status(404).json({ mensaje: "Ruta no encontrada" });
};

const traducir = (error) => {
  if (error instanceof ErrorNegocio) return [error.status, error.message];

  switch (error.type) {
    case "entity.parse.failed":
      return [400, "El cuerpo de la petición no es un JSON válido"];
    case "entity.too.large":
      return [413, "La petición es demasiado grande"];
  }

  switch (error.name) {
    case "SequelizeForeignKeyConstraintError":
      return error.parent?.code === "ER_ROW_IS_REFERENCED_2"
        ? [409, "No se puede eliminar: tiene préstamos registrados"]
        : [409, "El registro relacionado ya no existe"];
    case "SequelizeUniqueConstraintError":
      return [409, "Ya existe un registro con esos datos"];
  }

  return null;
};

const manejarErrores = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  const conocido = traducir(error);
  if (conocido) {
    const [status, mensaje] = conocido;
    return res.status(status).json({ mensaje });
  }

  console.error(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`,
    error,
  );
  res.status(500).json({ mensaje: "Error del servidor" });
};

module.exports = { rutaNoEncontrada, manejarErrores };
