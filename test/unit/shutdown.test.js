const { describe, it, mock } = require("node:test");
const assert = require("node:assert/strict");
const { crearApagado } = require("../../utils/shutdown");
const { estaApagando } = require("../../utils/serverState");

const loggerFalso = () => ({ info: mock.fn(), error: mock.fn() });

const servidorFalso = ({ cierra = true } = {}) => ({
  close: mock.fn((alTerminar) => cierra && setImmediate(alTerminar)),
  closeIdleConnections: mock.fn(),
});

describe("apagado ordenado", () => {
  it("deja de aceptar conexiones, cierra la base y termina con 0", async () => {
    const orden = [];
    const servidor = servidorFalso();
    servidor.close.mock.mockImplementation((alTerminar) => {
      orden.push("servidor");
      setImmediate(alTerminar);
    });
    const sequelize = {
      close: mock.fn(async () => orden.push("base")),
    };
    const logger = loggerFalso();

    const codigo = await crearApagado({ servidor, sequelize, logger })(
      "SIGTERM",
    );

    assert.equal(codigo, 0);
    assert.deepEqual(orden, ["servidor", "base"]);
    assert.equal(servidor.closeIdleConnections.mock.callCount(), 1);
    assert.equal(estaApagando(), true, "el healthcheck debe responder 503");
  });

  it("una segunda señal no repite el apagado", async () => {
    const servidor = servidorFalso();
    const sequelize = { close: mock.fn(async () => {}) };
    const apagar = crearApagado({ servidor, sequelize, logger: loggerFalso() });

    const [a, b] = await Promise.all([apagar("SIGTERM"), apagar("SIGINT")]);

    assert.deepEqual([a, b], [0, 0]);
    assert.equal(servidor.close.mock.callCount(), 1);
    assert.equal(sequelize.close.mock.callCount(), 1);
  });

  it("si cerrar la base falla, lo registra y termina con 1", async () => {
    const logger = loggerFalso();
    const sequelize = {
      close: async () => {
        throw new Error("sin conexión");
      },
    };

    const codigo = await crearApagado({
      servidor: servidorFalso(),
      sequelize,
      logger,
    })("SIGTERM");

    assert.equal(codigo, 1);
    assert.equal(logger.error.mock.callCount(), 1);
  });

  it("si algo se cuelga, fuerza la salida pasado el tiempo máximo", async (t) => {
    const salir = t.mock.method(process, "exit", () => {});
    crearApagado({
      servidor: servidorFalso({ cierra: false }),
      sequelize: { close: async () => {} },
      logger: loggerFalso(),
      tiempoMaximoMs: 20,
    })("SIGTERM");

    await new Promise((resolver) => setTimeout(resolver, 60));

    assert.equal(salir.mock.callCount(), 1);
    assert.equal(salir.mock.calls[0].arguments[0], 1);
  });
});
