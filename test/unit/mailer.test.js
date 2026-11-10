process.env.LOG_LEVEL ??= "silent";
const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { enviarCorreo } = require("../../services/mailer");
const { correoDeRecuperacion } = require("../../services/emailTemplates");
const logger = require("../../utils/logger");

const MENSAJE = {
  para: "lectora@x.com",
  asunto: "Asunto",
  html: "<p>Hola</p>",
  texto: "Hola",
};

const VARIABLES = [
  "RESEND_API_KEY",
  "CORREO_REMITENTE",
  "NODE_ENV",
  "RAILWAY_ENVIRONMENT",
];
let guardadas;
beforeEach(() => {
  guardadas = Object.fromEntries(VARIABLES.map((v) => [v, process.env[v]]));
  for (const v of VARIABLES) delete process.env[v];
});
afterEach(() => {
  for (const [v, valor] of Object.entries(guardadas)) {
    if (valor === undefined) delete process.env[v];
    else process.env[v] = valor;
  }
});

describe("envío con Resend", () => {
  it("llama a la API de Resend con la clave, el remitente y ambos formatos", async (t) => {
    process.env.RESEND_API_KEY = "re_prueba";
    process.env.CORREO_REMITENTE = "Biblioteca <hola@biblioteca.pe>";
    const fetchFalso = t.mock.method(
      globalThis,
      "fetch",
      async () => new Response(JSON.stringify({ id: "abc" }), { status: 200 }),
    );

    const resultado = await enviarCorreo(MENSAJE);

    assert.deepEqual(resultado, { id: "abc" });
    const [url, opciones] = fetchFalso.mock.calls[0].arguments;
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(opciones.method, "POST");
    assert.equal(opciones.headers.Authorization, "Bearer re_prueba");
    assert.deepEqual(JSON.parse(opciones.body), {
      from: "Biblioteca <hola@biblioteca.pe>",
      to: ["lectora@x.com"],
      subject: "Asunto",
      html: "<p>Hola</p>",
      text: "Hola",
    });
    assert.ok(opciones.signal, "la petición debe tener tiempo máximo");
  });

  it("si Resend rechaza el correo, el error dice por qué", async (t) => {
    process.env.RESEND_API_KEY = "re_prueba";
    t.mock.method(
      globalThis,
      "fetch",
      async () =>
        new Response('{"message":"domain not verified"}', { status: 403 }),
    );
    await assert.rejects(enviarCorreo(MENSAJE), /403.*domain not verified/);
  });

  it("sin clave en desarrollo muestra el correo en la terminal", async (t) => {
    const fetchFalso = t.mock.method(globalThis, "fetch");
    const aviso = t.mock.method(logger, "warn", () => {});

    assert.equal(await enviarCorreo(MENSAJE), null);
    assert.equal(fetchFalso.mock.callCount(), 0);
    assert.equal(aviso.mock.calls[0].arguments[0].contenido, "Hola");
  });

  it("sin clave en producción no envía ni escribe el contenido en los logs", async (t) => {
    process.env.RAILWAY_ENVIRONMENT = "production";
    const fetchFalso = t.mock.method(globalThis, "fetch");
    const error = t.mock.method(logger, "error", () => {});
    const aviso = t.mock.method(logger, "warn", () => {});

    assert.equal(await enviarCorreo(MENSAJE), null);
    assert.equal(fetchFalso.mock.callCount(), 0);
    assert.equal(aviso.mock.callCount(), 0);
    assert.doesNotMatch(JSON.stringify(error.mock.calls), /Hola/);
  });
});

describe("plantilla de recuperación", () => {
  it("incluye el enlace en ambos formatos y escapa el nombre en el HTML", () => {
    const correo = correoDeRecuperacion({
      nombre: "<script>x</script>",
      enlace: "https://b.pe/reset-password.html?token=abc",
      minutos: 60,
    });
    assert.match(
      correo.texto,
      /https:\/\/b\.pe\/reset-password\.html\?token=abc/,
    );
    assert.match(
      correo.html,
      /href="https:\/\/b\.pe\/reset-password\.html\?token=abc"/,
    );
    assert.doesNotMatch(correo.html, /<script>/);
    assert.match(correo.html, /&lt;script&gt;/);
  });
});
