const { Transaction } = require("sequelize");
const { sequelize } = require("../models");

// Transacción con READ COMMITTED: después de obtener el bloqueo de una fila,
// las consultas ven lo que otras transacciones ya confirmaron (por ejemplo,
// el conteo de ejemplares prestados).
const transaccion = (fn) =>
  sequelize.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED },
    fn,
  );

module.exports = { transaccion };
