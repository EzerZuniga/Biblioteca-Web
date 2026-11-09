const { SolicitudInvalida } = require("../utils/errors");

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
      return next(new SolicitudInvalida(errores[0].mensaje, errores));
    }
    // En Express 5, req.query es un getter de solo lectura: una asignación
    // normal se ignora en silencio. Definir la propiedad en la petición la
    // reemplaza de verdad, y funciona igual para body y params.
    Object.defineProperty(req, parte, {
      value: resultado.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  next();
};

module.exports = validar;
