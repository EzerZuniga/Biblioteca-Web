class ErrorNegocio extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

const responderError = (res, error) => {
  if (error instanceof ErrorNegocio) {
    return res.status(error.status).json({ mensaje: error.message });
  }
  console.error(error);
  return res.status(500).json({ mensaje: "Error del servidor" });
};

module.exports = { ErrorNegocio, responderError };
