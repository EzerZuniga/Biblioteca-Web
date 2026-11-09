const { z } = require("zod");
const { entero, paginacion } = require("./common");
const { ESTADOS } = require("../models/Loan");

// "vencido" se puede filtrar aunque no sea un estado guardado.
const FILTROS_DE_ESTADO = [...ESTADOS, "vencido"];

const crear = z.object({
  libro_id: entero("Indica un libro válido", { min: 1 }),
});

const listado = z.object({
  estado: z.enum(FILTROS_DE_ESTADO, { error: "Estado no válido" }).optional(),
  ...paginacion,
});

const rechazo = z.object({
  motivo: z
    .string({ error: "El motivo debe ser texto" })
    .trim()
    .max(255, { error: "El motivo admite como máximo 255 caracteres" })
    .optional()
    .transform((motivo) => motivo || undefined),
});

module.exports = { FILTROS_DE_ESTADO, crear, listado, rechazo };
