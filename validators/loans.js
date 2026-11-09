const { z } = require("zod");
const { entero, paginacion } = require("./common");

const ESTADOS = ["pendiente", "prestado", "devuelto"];

const crear = z.object({
  libro_id: entero("Indica un libro válido", { min: 1 }),
});

const listado = z.object({
  estado: z.enum(ESTADOS, { error: "Estado no válido" }).optional(),
  ...paginacion,
});

module.exports = { ESTADOS, crear, listado };
