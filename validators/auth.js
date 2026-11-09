const { z } = require("zod");
const { LIMITES, texto, email, password } = require("./comunes");

const MIN_PASSWORD = 6;

const registro = z.object({
  nombre: texto("El nombre", LIMITES.nombre),
  email,
  password: password(MIN_PASSWORD),
});

// En el login no se detalla qué campo falló, solo que faltan datos.
const FALTAN_DATOS = "Ingresa tu email y tu contraseña";
const login = z.object({
  email: z
    .string({ error: FALTAN_DATOS })
    .trim()
    .toLowerCase()
    .min(1, { error: FALTAN_DATOS })
    .max(LIMITES.email, { error: FALTAN_DATOS }),
  password: z
    .string({ error: FALTAN_DATOS })
    .min(1, { error: FALTAN_DATOS })
    .max(200, { error: FALTAN_DATOS }),
});

module.exports = { MIN_PASSWORD, registro, login };
