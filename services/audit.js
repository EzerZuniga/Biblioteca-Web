const { Auditoria, Usuario } = require("../models");
const { paginar } = require("./pagination");

// Se llama dentro de la misma transacción que la acción: si la acción se
// deshace, su registro también, y nunca queda una acción sin registrar.
const registrar = (
  { actorId, accion, entidad, entidadId, detalles },
  transaction,
) =>
  Auditoria.create(
    {
      usuario_id: actorId ?? null,
      accion,
      entidad,
      entidad_id: entidadId ?? null,
      detalles: detalles ?? null,
    },
    { transaction },
  );

const listar = ({ entidad, entidadId, ...pagina } = {}) =>
  paginar(
    Auditoria,
    {
      where: {
        ...(entidad && { entidad }),
        ...(entidadId && { entidad_id: entidadId }),
      },
      include: [
        { model: Usuario, as: "actor", attributes: ["id", "nombre", "email"] },
      ],
      order: [["id", "DESC"]],
    },
    pagina,
  );

// Solo los campos que llegaron y de verdad cambiaron.
const diferencias = (antes, despues) =>
  Object.fromEntries(
    Object.entries(despues)
      .filter(([campo, valor]) => valor !== undefined && antes[campo] !== valor)
      .map(([campo, valor]) => [
        campo,
        { antes: antes[campo], despues: valor },
      ]),
  );

module.exports = { registrar, listar, diferencias };
