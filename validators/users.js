const { z } = require("zod");
const {
  LIMITES,
  texto,
  email,
  password,
  sinIndefinidos,
} = require("./comunes");
const { MIN_PASSWORD } = require("./auth");

const actualizar = z
  .object({
    nombre: texto("El nombre", LIMITES.nombre).optional(),
    email: email.optional(),
    rol: z.enum(["admin", "usuario"], { error: "Rol no válido" }).optional(),
    // El formulario envía la contraseña vacía cuando no se quiere cambiar.
    password: z.preprocess(
      (valor) => (valor === "" ? undefined : valor),
      password(MIN_PASSWORD).optional(),
    ),
  })
  .transform(sinIndefinidos);

const MIN_PASSWORD_ADMIN = 10;

// Para crear-admin y el administrador inicial: clave más exigente.
const admin = z.object({
  email,
  password: password(MIN_PASSWORD_ADMIN).refine(
    (clave) => /[a-zA-Z]/.test(clave) && /\d/.test(clave),
    { error: "La contraseña debe combinar letras y números" },
  ),
  nombre: texto("El nombre", LIMITES.nombre).default("Administrador"),
});

const adminDesdeEntorno = (env = process.env) =>
  admin.safeParse({
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
    nombre: env.ADMIN_NOMBRE || undefined,
  });

module.exports = { actualizar, admin, adminDesdeEntorno, MIN_PASSWORD_ADMIN };
