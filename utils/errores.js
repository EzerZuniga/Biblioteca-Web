class ErrorNegocio extends Error {
  constructor(status, mensaje, errores) {
    super(mensaje);
    this.name = "ErrorNegocio";
    this.status = status;
    this.errores = errores;
  }
}

const buscarOFallar = async (modelo, id, mensaje, opciones) => {
  const registro = await modelo.findByPk(id, opciones);
  if (!registro) throw new ErrorNegocio(404, mensaje);
  return registro;
};

// Express 4 no captura los errores de funciones async; así llegan al
// manejador central en lugar de dejar la petición colgada.
const capturarErrores = (controlador) =>
  Object.fromEntries(
    Object.entries(controlador).map(([nombre, accion]) => [
      nombre,
      async (req, res, next) => {
        try {
          await accion(req, res, next);
        } catch (error) {
          next(error);
        }
      },
    ]),
  );

module.exports = { ErrorNegocio, buscarOFallar, capturarErrores };
