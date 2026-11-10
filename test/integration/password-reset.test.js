const bd = require("../helpers/db");
const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const api = require("../helpers/api");
const { crearLector } = require("../helpers/fixtures");
const mailer = require("../../services/mailer");

before(() => bd.crearBaseDePrueba());
after(() => bd.borrarBaseDePrueba());
beforeEach(async () => {
  await bd.vaciarTablas();
  delete process.env.URL_PUBLICA;
  delete process.env.RAILWAY_PUBLIC_DOMAIN;
  delete process.env.RAILWAY_ENVIRONMENT;
});

const MENSAJE_GENERICO = /Si ese email está registrado/;

// Captura los correos en lugar de enviarlos.
const capturarCorreos = (t) =>
  t.mock.method(mailer, "enviarCorreo", async () => null);

const pedirEnlace = (email, opciones = {}) =>
  api.post("/api/v1/auth/recuperar", { cuerpo: { email }, ...opciones });

const tokenDe = (correos, indice = 0) =>
  correos.mock.calls[indice].arguments[0].texto.match(/token=([\w-]+)/)[1];

const restablecer = (token, password = "claveNueva9") =>
  api.post("/api/v1/auth/restablecer", { cuerpo: { token, password } });

describe("pedir un enlace", () => {
  it("envía un enlace de un solo uso al email registrado", async (t) => {
    const correos = capturarCorreos(t);
    const lector = await crearLector();

    const res = await pedirEnlace(lector.email.toUpperCase());

    assert.equal(res.status, 200);
    assert.match(res.body.mensaje, MENSAJE_GENERICO);
    assert.equal(correos.mock.callCount(), 1);
    const correo = correos.mock.calls[0].arguments[0];
    assert.equal(correo.para, lector.email);
    assert.match(correo.texto, /\/reset-password\.html\?token=[\w-]{43}/);
  });

  it("responde lo mismo si el email no existe, sin enviar nada", async (t) => {
    const correos = capturarCorreos(t);
    const res = await pedirEnlace("nadie@prueba.com");
    assert.equal(res.status, 200);
    assert.match(res.body.mensaje, MENSAJE_GENERICO);
    assert.equal(correos.mock.callCount(), 0);
  });

  it("no reenvía si ya se pidió un enlace hace menos de 2 minutos", async (t) => {
    const correos = capturarCorreos(t);
    const lector = await crearLector();
    await pedirEnlace(lector.email);
    await pedirEnlace(lector.email);
    assert.equal(correos.mock.callCount(), 1);
  });

  it("guarda solo el hash del token, nunca el token", async (t) => {
    const correos = capturarCorreos(t);
    const lector = await crearLector();
    await pedirEnlace(lector.email);
    const token = tokenDe(correos);

    const [fila] = await bd.consultar("SELECT token_hash FROM recuperaciones");
    assert.notEqual(fila.token_hash, token);
    assert.equal(
      fila.token_hash,
      crypto.createHash("sha256").update(token).digest("hex"),
    );
  });

  it("limita los pedidos por conexión", async (t) => {
    capturarCorreos(t);
    const estados = [];
    for (let i = 0; i < 6; i++) {
      estados.push(
        (await pedirEnlace(`x${i}@prueba.com`, { ip: "203.0.113.90" })).status,
      );
    }
    assert.deepEqual(estados, [200, 200, 200, 200, 200, 429]);
  });
});

describe("dirección del enlace", () => {
  it("usa URL_PUBLICA e ignora un Host falso en la petición", async (t) => {
    process.env.URL_PUBLICA = "https://biblioteca.example/";
    const correos = capturarCorreos(t);
    const lector = await crearLector();

    await pedirEnlace(lector.email).set("Host", "sitio-malicioso.com");

    assert.match(
      correos.mock.calls[0].arguments[0].texto,
      /https:\/\/biblioteca\.example\/reset-password\.html\?token=/,
    );
  });

  it("en Railway usa el dominio público que Railway define", async (t) => {
    process.env.RAILWAY_ENVIRONMENT = "production";
    process.env.RAILWAY_PUBLIC_DOMAIN = "biblioteca.up.railway.app";
    const correos = capturarCorreos(t);
    const lector = await crearLector();

    await pedirEnlace(lector.email).set("Host", "sitio-malicioso.com");

    assert.match(
      correos.mock.calls[0].arguments[0].texto,
      /^https:\/\/biblioteca\.up\.railway\.app\/reset-password/m,
    );
  });

  it("en producción sin dominio configurado no envía nada", async (t) => {
    process.env.RAILWAY_ENVIRONMENT = "production";
    const correos = capturarCorreos(t);
    const lector = await crearLector();

    const res = await pedirEnlace(lector.email);
    assert.equal(res.status, 200);
    assert.equal(correos.mock.callCount(), 0);
  });
});

describe("restablecer la contraseña", () => {
  it("cambia la contraseña, cierra las sesiones y queda registrado", async (t) => {
    const correos = capturarCorreos(t);
    const lector = await crearLector();
    await pedirEnlace(lector.email);

    const res = await restablecer(tokenDe(correos));

    assert.equal(res.status, 200);
    const login = await api.post("/api/v1/auth/login", {
      cuerpo: { email: lector.email, password: "claveNueva9" },
    });
    assert.equal(login.status, 200);
    const sesionVieja = await api.get("/api/v1/auth/yo", {
      token: lector.token,
    });
    assert.equal(sesionVieja.status, 401);

    const acciones = await bd.consultar(
      "SELECT accion FROM auditoria WHERE accion LIKE 'usuario.%' ORDER BY id",
    );
    assert.deepEqual(
      acciones.map((a) => a.accion),
      [
        "usuario.registrado",
        "usuario.recuperacion_solicitada",
        "usuario.contrasena_restablecida",
      ],
    );
  });

  it("el enlace sirve una sola vez", async (t) => {
    const correos = capturarCorreos(t);
    const lector = await crearLector();
    await pedirEnlace(lector.email);
    const token = tokenDe(correos);

    assert.equal((await restablecer(token)).status, 200);
    const segunda = await restablecer(token, "otraClave1");
    assert.equal(segunda.status, 400);
    assert.match(segunda.body.mensaje, /no es válido o ya venció/);
  });

  it("dos usos simultáneos del mismo enlace: solo uno funciona", async (t) => {
    const correos = capturarCorreos(t);
    const lector = await crearLector();
    await pedirEnlace(lector.email);
    const token = tokenDe(correos);

    const estados = (
      await Promise.all([
        restablecer(token, "claveUno1"),
        restablecer(token, "claveDos2"),
      ])
    )
      .map((r) => r.status)
      .sort();
    assert.deepEqual(estados, [200, 400]);
  });

  it("un enlace vencido no sirve", async (t) => {
    const correos = capturarCorreos(t);
    const lector = await crearLector();
    await pedirEnlace(lector.email);
    await bd.consultar(
      "UPDATE recuperaciones SET expira_en = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE)",
    );
    assert.equal((await restablecer(tokenDe(correos))).status, 400);
  });

  it("pedir un enlace nuevo anula el anterior", async (t) => {
    const correos = capturarCorreos(t);
    const lector = await crearLector();
    await pedirEnlace(lector.email);
    // Simula que pasaron los 2 minutos de espera entre envíos.
    await bd.consultar(
      "UPDATE recuperaciones SET creado_en = DATE_SUB(creado_en, INTERVAL 3 MINUTE)",
    );
    await pedirEnlace(lector.email);

    assert.equal((await restablecer(tokenDe(correos, 0))).status, 400);
    assert.equal((await restablecer(tokenDe(correos, 1))).status, 200);
  });

  it("valida el formato del token y la contraseña", async () => {
    assert.equal((await restablecer("corto")).status, 400);
    const debil = await restablecer("a".repeat(43), "123");
    assert.equal(debil.status, 400);
    assert.match(debil.body.mensaje, /al menos 6 caracteres/);
  });
});
