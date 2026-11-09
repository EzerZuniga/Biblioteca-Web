class ErrorNegocio extends Error {
  constructor(status, mensaje, errores) {
    super(mensaje);
    this.name = this.constructor.name;
    this.status = status;
    this.errores = errores;
  }
}

// Los servicios lanzan estos errores por su significado; el manejador central
// los traduce a la respuesta HTTP con el estado de cada uno.
class SolicitudInvalida extends ErrorNegocio {
  constructor(mensaje, errores) {
    super(400, mensaje, errores);
  }
}

class NoAutenticado extends ErrorNegocio {
  constructor(mensaje) {
    super(401, mensaje);
  }
}

class SinPermiso extends ErrorNegocio {
  constructor(mensaje) {
    super(403, mensaje);
  }
}

class NoEncontrado extends ErrorNegocio {
  constructor(mensaje) {
    super(404, mensaje);
  }
}

class Conflicto extends ErrorNegocio {
  constructor(mensaje) {
    super(409, mensaje);
  }
}

const buscarOFallar = async (modelo, id, mensaje, opciones) => {
  const registro = await modelo.findByPk(id, opciones);
  if (!registro) throw new NoEncontrado(mensaje);
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

module.exports = {
  ErrorNegocio,
  SolicitudInvalida,
  NoAutenticado,
  SinPermiso,
  NoEncontrado,
  Conflicto,
  buscarOFallar,
  capturarErrores,
};
