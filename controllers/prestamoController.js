const prestamos = require("../services/prestamos");
const { capturarErrores } = require("../utils/errores");

const crear = async (req, res) => {
  const prestamo = await prestamos.solicitar(req.usuario.id, req.body.libro_id);
  res.status(201).json({
    mensaje: `Solicitud enviada. Tu código es ${prestamo.codigo}`,
    prestamo,
  });
};

const listar = async (req, res) => {
  res.json(await prestamos.listarPara(req.usuario));
};

const aprobar = async (req, res) => {
  const prestamo = await prestamos.aprobar(req.params.id);
  res.json({ mensaje: "Préstamo aprobado", prestamo });
};

const devolver = async (req, res) => {
  const prestamo = await prestamos.devolver(req.params.id);
  res.json({ mensaje: "Devolución registrada", prestamo });
};

module.exports = capturarErrores({ crear, listar, aprobar, devolver });
