const { z } = require("zod");
const { LIMITES, texto, email, password } = require("./common");

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

const recuperacion = z.object({ email });

// El token del enlace son 32 bytes en base64url: 43 caracteres.
const restablecimiento = z.object({
  token: z
    .string({ error: "El enlace no es válido o ya venció. Pide uno nuevo." })
    .regex(/^[A-Za-z0-9_-]{43}$/, {
      error: "El enlace no es válido o ya venció. Pide uno nuevo.",
    }),
  password: password(MIN_PASSWORD),
});

module.exports = {
  MIN_PASSWORD,
  registro,
  login,
  recuperacion,
  restablecimiento,
};
