const { describe, it, mock } = require("node:test");
const assert = require("node:assert/strict");
const {
  manejarErrores,
  rutaNoEncontrada,
} = require("../../middlewares/errors");
const {
  SolicitudInvalida,
  NoAutenticado,
  SinPermiso,
  NoEncontrado,
  Conflicto,
  capturarErrores,
} = require("../../utils/errors");

const respuestaFalsa = ({ enviada = false } = {}) => {
  const res = { headersSent: enviada, statusCode: null, body: null };
  res.status = (codigo) => {
    res.statusCode = codigo;
    return res;
  };
  res.json = (cuerpo) => {
    res.body = cuerpo;
    return res;
  };
  return res;
};

const req = { method: "PUT", originalUrl: "/prestamos/7/aprobar" };

const manejar = (error, opciones) => {
  const res = respuestaFalsa(opciones);
  let siguiente;
  manejarErrores(error, req, res, (e) => (siguiente = e));
  return { res, siguiente };
};

const errorDeSequelize = (name, code) =>
  Object.assign(new Error("x"), { name, parent: { code } });

describe("manejador central de errores", () => {
  it("traduce cada error de negocio a su estado", () => {
    const casos = [
      [new SolicitudInvalida("a"), 400],
      [new NoAutenticado("b"), 401],
      [new SinPermiso("c"), 403],
      [new NoEncontrado("d"), 404],
      [new Conflicto("e"), 409],
    ];
    for (const [error, estado] of casos) {
      const { res } = manejar(error);
      assert.equal(res.statusCode, estado);
      assert.deepEqual(res.body, { mensaje: error.message });
    }
  });

  it("incluye el detalle por campo de una validación", () => {
    const errores = [{ campo: "nombre", mensaje: "falta" }];
    const { res } = manejar(new SolicitudInvalida("falta", errores));
    assert.deepEqual(res.body, { mensaje: "falta", errores });
  });

  it("traduce errores de Express y de la base", () => {
    const casos = [
      [
        Object.assign(new SyntaxError("x"), { type: "entity.parse.failed" }),
        400,
      ],
      [Object.assign(new Error("x"), { type: "entity.too.large" }), 413],
      [
        errorDeSequelize(
          "SequelizeForeignKeyConstraintError",
          "ER_ROW_IS_REFERENCED_2",
        ),
        409,
      ],
      [
        errorDeSequelize(
          "SequelizeForeignKeyConstraintError",
          "ER_NO_REFERENCED_ROW_2",
        ),
        409,
      ],
      [errorDeSequelize("SequelizeUniqueConstraintError", "ER_DUP_ENTRY"), 409],
    ];
    for (const [error, estado] of casos) {
      assert.equal(manejar(error).res.statusCode, estado);
    }
    assert.match(
      manejar(
        errorDeSequelize(
          "SequelizeForeignKeyConstraintError",
          "ER_NO_REFERENCED_ROW_2",
        ),
      ).res.body.mensaje,
      /ya no existe/,
    );
  });

  it("responde 500 sin detalles y registra el error inesperado", (t) => {
    const registro = t.mock.method(console, "error", () => {});
    const error = new TypeError("cannot read properties of undefined");

    const { res } = manejar(error);

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { mensaje: "Error del servidor" });
    assert.equal(registro.mock.callCount(), 1);
    const [contexto, registrado] = registro.mock.calls[0].arguments;
    assert.match(contexto, /PUT \/prestamos\/7\/aprobar/);
    assert.equal(registrado, error);
  });

  it("delega en Express si la respuesta ya salió", () => {
    const error = new Error("x");
    const { res, siguiente } = manejar(error, { enviada: true });
    assert.equal(siguiente, error);
    assert.equal(res.statusCode, null);
  });

  it("responde 404 a una ruta inexistente", () => {
    const res = respuestaFalsa();
    rutaNoEncontrada({}, res);
    assert.equal(res.statusCode, 404);
  });
});

describe("capturarErrores", () => {
  const envuelto = capturarErrores({
    asincrona: async () => {
      throw new NoEncontrado("no está");
    },
    sincrona: () => {
      throw new Error("sync");
    },
    correcta: async (q, res) => res.status(200).json({ ok: true }),
  });

  it("pasa a next los errores async y síncronos", async () => {
    const next = mock.fn();
    await envuelto.asincrona({}, respuestaFalsa(), next);
    await envuelto.sincrona({}, respuestaFalsa(), next);
    assert.ok(next.mock.calls[0].arguments[0] instanceof NoEncontrado);
    assert.equal(next.mock.calls[1].arguments[0].message, "sync");
  });

  it("no llama a next si no hay error", async () => {
    const next = mock.fn();
    const res = respuestaFalsa();
    await envuelto.correcta({}, res, next);
    assert.equal(res.statusCode, 200);
    assert.equal(next.mock.callCount(), 0);
  });
});
