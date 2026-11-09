const { z } = require("zod");
const { LIMITES, texto, entero, sinIndefinidos } = require("./common");

const titulo = texto("El título", LIMITES.titulo);
const autor = texto("El autor", LIMITES.autor);
const cantidad = entero(
  "La cantidad de ejemplares debe ser un número entero de 0 o más",
);
const categoria = z
  .string({ error: "La categoría debe ser texto" })
  .trim()
  .max(LIMITES.categoria, {
    error: `La categoría admite como máximo ${LIMITES.categoria} caracteres`,
  })
  .optional();

const crear = z.object({
  titulo,
  autor,
  categoria: categoria.transform((valor) => valor || "General"),
  cantidad,
});

const actualizar = z
  .object({
    titulo: titulo.optional(),
    autor: autor.optional(),
    categoria: categoria.transform((valor) =>
      valor === undefined ? undefined : valor || "General",
    ),
    cantidad: cantidad.optional(),
  })
  .transform(sinIndefinidos);

const busqueda = z.object({
  titulo: z
    .string({ error: "La búsqueda debe ser texto" })
    .trim()
    .max(LIMITES.titulo, { error: "La búsqueda es demasiado larga" })
    .optional(),
});

module.exports = { crear, actualizar, busqueda };
