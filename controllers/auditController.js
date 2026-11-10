const auditoria = require("../services/audit");
const { capturarErrores } = require("../utils/errors");

const listar = async (req, res) => {
  res.json(await auditoria.listar(req.query));
};

module.exports = capturarErrores({ listar });
