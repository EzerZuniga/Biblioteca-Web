const { ErrorNegocio } = require("../utils/errores");

// Valida y normaliza body, params o query con esquemas de zod. Los campos que
// no están en el esquema se descartan, así nadie puede colar, por ejemplo,
// un "rol" en el registro.
const validar = (esquemas) => (req, res, next) => {
  for (const [parte, esquema] of Object.entries(esquemas)) {
    const resultado = esquema.safeParse(req[parte] ?? {});
    if (!resultado.success) {
      const errores = resultado.error.issues.map((issue) => ({
        campo: issue.path.join("."),
        mensaje: issue.message,
      }));
      return next(new ErrorNegocio(400, errores[0].mensaje, errores));
    }
    req[parte] = resultado.data;
  }
  next();
};

module.exports = validar;
