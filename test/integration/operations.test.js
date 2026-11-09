const bd = require("../helpers/db");
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const api = require("../helpers/api");
const { sequelize } = require("../../models");
const { marcarApagando } = require("../../utils/serverState");
const { API_ANTERIOR } = require("../../routes/legacyRedirects");

before(() => bd.crearBaseDePrueba());
after(() => bd.borrarBaseDePrueba());

describe("GET /health", () => {
  it("responde 200 con la base conectada y sin caché", async () => {
    const res = await api.get("/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.estado, "ok");
    assert.equal(res.body.baseDeDatos, "ok");
    assert.ok(res.body.version);
    assert.equal(res.headers["cache-control"], "no-store");
  });

  it("responde 503 sin detalles si la base no contesta", async (t) => {
    t.mock.method(sequelize, "query", async () => {
      throw new Error("connect ECONNREFUSED 10.0.0.1:3306");
    });
    const res = await api.get("/health");
    assert.equal(res.status, 503);
    assert.equal(res.body.baseDeDatos, "sin conexión");
    assert.doesNotMatch(JSON.stringify(res.body), /ECONNREFUSED/);
  });
});

describe("identificador de petición", () => {
  it("cada respuesta trae uno nuevo", async () => {
    const [a, b] = await Promise.all([api.get("/health"), api.get("/health")]);
    assert.match(a.headers["x-request-id"], /^[0-9a-f-]{36}$/);
    assert.notEqual(a.headers["x-request-id"], b.headers["x-request-id"]);
  });

  it("respeta el que envía el proxy y descarta uno malicioso", async () => {
    const propio = await api
      .get("/health")
      .set("X-Request-Id", "railway-abc-123");
    assert.equal(propio.headers["x-request-id"], "railway-abc-123");

    const malicioso = await api
      .get("/health")
      .set("X-Request-Id", "x <script>alert(1)</script>");
    assert.match(malicioso.headers["x-request-id"], /^[0-9a-f-]{36}$/);
  });
});

describe("rutas de la API anteriores a /api/v1", () => {
  it("piden recargar la página en lugar de responder 404", async () => {
    for (const ruta of API_ANTERIOR) {
      const res = await api.get(`${ruta}/algo`);
      assert.equal(res.status, 410, ruta);
      assert.match(res.body.mensaje, /Recarga la página/);
    }
  });
});

// Va al final: marcar el apagado afecta al resto del archivo.
describe("durante el apagado", () => {
  it("el healthcheck responde 503 para que no llegue tráfico nuevo", async () => {
    marcarApagando();
    const res = await api.get("/health");
    assert.equal(res.status, 503);
    assert.equal(res.body.estado, "apagando");
  });
});
