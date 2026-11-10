const { z } = require("zod");
const { entero, paginacion } = require("./common");

const ENTIDADES = ["prestamo", "libro", "usuario"];

const listado = z.object({
  entidad: z.enum(ENTIDADES, { error: "Entidad no válida" }).optional(),
  entidadId: entero("El identificador no es válido", { min: 1 }).optional(),
  ...paginacion,
});

module.exports = { ENTIDADES, listado };
