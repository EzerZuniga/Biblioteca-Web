const { z } = require("zod");
const {
  LIMITES,
  texto,
  entero,
  paginacion,
  sinIndefinidos,
} = require("./common");
const { normalizarIsbn, isbnValido } = require("../utils/isbn");

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

// Campos opcionales: un texto vacío del formulario los deja en blanco (null).
const vacioANull = (valor) =>
  typeof valor === "string" && valor.trim() === "" ? null : valor;
const opcional = (esquema) =>
  z.preprocess(vacioANull, esquema.nullable()).optional();

const isbn = opcional(
  z
    .string({ error: "El ISBN debe ser texto" })
    .transform(normalizarIsbn)
    .refine(isbnValido, {
      error:
        "El ISBN no es válido: debe tener 10 o 13 dígitos y el último debe coincidir",
    }),
);
const editorial = opcional(
  z
    .string({ error: "La editorial debe ser texto" })
    .trim()
    .max(LIMITES.editorial, {
      error: `La editorial admite como máximo ${LIMITES.editorial} caracteres`,
    }),
);
const ANIO_MAXIMO = new Date().getFullYear() + 1;
const anio = opcional(
  entero(`El año debe estar entre 1000 y ${ANIO_MAXIMO}`, {
    min: 1000,
    max: ANIO_MAXIMO,
  }),
);

const crear = z.object({
  titulo,
  autor,
  categoria: categoria.transform((valor) => valor || "General"),
  isbn,
  editorial,
  anio,
  cantidad,
});

const actualizar = z
  .object({
    titulo: titulo.optional(),
    autor: autor.optional(),
    categoria: categoria.transform((valor) =>
      valor === undefined ? undefined : valor || "General",
    ),
    isbn,
    editorial,
    anio,
    cantidad: cantidad.optional(),
  })
  .transform(sinIndefinidos);

const textoDeBusqueda = z
  .string({ error: "La búsqueda debe ser texto" })
  .trim()
  .max(LIMITES.titulo, { error: "La búsqueda es demasiado larga" })
  .optional();

const busqueda = z.object({
  // Busca en título, autor e ISBN a la vez.
  buscar: textoDeBusqueda,
  // Solo en el título (se mantiene por compatibilidad).
  titulo: textoDeBusqueda,
  ...paginacion,
});

module.exports = { crear, actualizar, busqueda };
