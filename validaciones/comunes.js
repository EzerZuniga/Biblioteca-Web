const { z } = require("zod");

// Mismos límites que las columnas de models/, para que un texto largo se
// rechace con un mensaje claro y no como error de la base.
const LIMITES = {
  nombre: 100,
  email: 150,
  titulo: 200,
  autor: 150,
  categoria: 100,
  // bcrypt ignora lo que pase de 72 bytes.
  passwordBytes: 72,
  enteroMaximo: 2147483647,
};

const terminacion = (femenino) => (femenino ? "a" : "o");

const texto = (campo, max, { femenino = false } = {}) =>
  z
    .string({
      error: (issue) =>
        issue.input == null
          ? `${campo} es obligatori${terminacion(femenino)}`
          : `${campo} debe ser texto`,
    })
    .trim()
    .min(1, { error: `${campo} no puede estar vací${terminacion(femenino)}` })
    .max(max, { error: `${campo} admite como máximo ${max} caracteres` });

const email = z
  .string({ error: "El email es obligatorio" })
  .trim()
  .toLowerCase()
  .max(LIMITES.email, {
    error: `El email admite como máximo ${LIMITES.email} caracteres`,
  })
  .pipe(z.email({ error: "El email no tiene un formato válido" }));

const password = (minimo) =>
  z
    .string({ error: "La contraseña es obligatoria" })
    .min(minimo, {
      error: `La contraseña debe tener al menos ${minimo} caracteres`,
    })
    .refine((clave) => Buffer.byteLength(clave) <= LIMITES.passwordBytes, {
      error: "La contraseña es demasiado larga",
    });

// Los formularios envían números como texto: "5" se acepta, "" y "abc" no.
const aNumero = (valor) =>
  typeof valor === "string" && valor.trim() !== "" ? Number(valor) : valor;

const entero = (mensaje, { min = 0, max = LIMITES.enteroMaximo } = {}) =>
  z.preprocess(
    aNumero,
    z
      .number({ error: mensaje })
      .int({ error: mensaje })
      .min(min, { error: mensaje })
      .max(max, { error: mensaje }),
  );

const paramId = z.object({
  id: entero("El identificador no es válido", { min: 1 }),
});

// Para actualizaciones parciales: solo quedan los campos que llegaron.
const sinIndefinidos = (datos) =>
  Object.fromEntries(
    Object.entries(datos).filter(([, valor]) => valor !== undefined),
  );

module.exports = {
  LIMITES,
  texto,
  email,
  password,
  entero,
  paramId,
  sinIndefinidos,
};
