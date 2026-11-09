// Arranca server.js como lo hace Railway: proceso aparte, logs en JSON por la
// salida estándar y apagado con SIGTERM.
const bd = require("../helpers/db");
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawn } = require("node:child_process");

const RAIZ = path.join(__dirname, "../..");
const ESPERA_MAXIMA_MS = 30000;

const arrancar = (variables = {}) => {
  const proceso = spawn(process.execPath, ["server.js"], {
    cwd: RAIZ,
    env: {
      ...process.env,
      PORT: "0",
      LOG_LEVEL: "info",
      NODE_ENV: "production",
      ...variables,
    },
  });
  const servidor = { proceso, salida: "", logs: [] };
  proceso.stdout.on("data", (trozo) => {
    servidor.salida += trozo;
    servidor.logs = servidor.salida
      .split("\n")
      .filter(Boolean)
      .map((linea) => JSON.parse(linea));
  });
  servidor.termino = new Promise((resolver) => proceso.on("exit", resolver));
  return servidor;
};

const esperar = async (condicion) => {
  const limite = Date.now() + ESPERA_MAXIMA_MS;
  while (Date.now() < limite) {
    const valor = condicion();
    if (valor) return valor;
    await new Promise((resolver) => setTimeout(resolver, 100));
  }
  throw new Error("Tiempo de espera agotado");
};

const buscarLog = (servidor, mensaje) =>
  servidor.logs.find((log) => log.msg === mensaje);

describe("server.js", () => {
  let servidor;
  let url;

  before(async () => {
    await bd.crearBaseDePrueba({ preparar: false });
    servidor = arrancar();
    const listo = await esperar(() => buscarLog(servidor, "Servidor listo"));
    url = `http://127.0.0.1:${listo.puerto}`;
  });

  after(async () => {
    if (servidor.proceso.exitCode === null) {
      servidor.proceso.kill();
      await servidor.termino;
    }
    await bd.borrarBaseDePrueba();
  });

  it("prepara una base vacía y escribe logs en JSON", () => {
    const migraciones = servidor.logs.filter(
      (l) => l.msg === "Migración aplicada",
    );
    assert.equal(migraciones.length, 3);
    assert.ok(buscarLog(servidor, "Libros iniciales creados"));
  });

  it("responde al healthcheck", async () => {
    const res = await fetch(`${url}/health`);
    assert.equal(res.status, 200);
  });

  it("registra cada petición a la API con su id y sin el token", async () => {
    const res = await fetch(`${url}/api/v1/libros`, {
      headers: { Authorization: "Bearer token-que-no-debe-aparecer" },
    });
    assert.equal(res.status, 401);
    const id = res.headers.get("x-request-id");

    const registro = await esperar(() =>
      servidor.logs.find((log) => log.req?.id === id),
    );
    assert.equal(registro.res.statusCode, 401);
    assert.equal(registro.level, 40, "un 4xx se registra como advertencia");
    assert.doesNotMatch(servidor.salida, /token-que-no-debe-aparecer/);
  });

  it(
    "con SIGTERM termina las peticiones, cierra la base y sale con 0",
    {
      skip: process.platform === "win32" && "Windows no entrega SIGTERM a Node",
    },
    async () => {
      servidor.proceso.kill("SIGTERM");
      const codigo = await servidor.termino;
      assert.equal(codigo, 0);
      assert.ok(buscarLog(servidor, "Apagando el servidor"));
      assert.ok(buscarLog(servidor, "Servidor detenido"));
    },
  );
});

describe("server.js sin base de datos", () => {
  it("registra el error fatal y sale con 1", async () => {
    const servidor = arrancar({ DB_NAME: "biblioteca_que_no_existe" });
    const codigo = await servidor.termino;
    assert.equal(codigo, 1);
    assert.ok(
      servidor.logs.some((log) => log.level === 60),
      "debe haber un log fatal",
    );
  });
});
