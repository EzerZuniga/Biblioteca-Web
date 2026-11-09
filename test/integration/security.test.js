const bd = require("../helpers/db");
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const api = require("../helpers/api");
const { crearLector } = require("../helpers/fixtures");

before(() => bd.crearBaseDePrueba());
after(() => bd.borrarBaseDePrueba());

describe("cabeceras", () => {
  it("envía una política de contenido estricta, HSTS y oculta Express", async () => {
    const res = await api.get("/login.html");
    const csp = res.headers["content-security-policy"];
    assert.match(csp, /script-src 'self'/);
    assert.match(csp, /frame-ancestors 'self'/);
    assert.doesNotMatch(csp, /upgrade-insecure-requests/);
    assert.ok(res.headers["strict-transport-security"]);
    assert.equal(res.headers["x-powered-by"], undefined);
  });

  it("no habilita CORS para otros sitios", async () => {
    const res = await api
      .get("/libros")
      .set("Origin", "https://sitio-malicioso.com");
    assert.equal(res.headers["access-control-allow-origin"], undefined);
  });

  it("no hay scripts en línea en el HTML", async () => {
    const res = await api.get("/");
    assert.doesNotMatch(res.text, /<script>/);
    assert.equal((await api.get("/js/home.js")).status, 200);
  });
});

describe("límites de intentos", () => {
  it("el login bloquea una IP tras 10 intentos fallidos", async () => {
    const lector = await crearLector();
    const ip = "203.0.113.10";
    const intento = (password, desde = ip) =>
      api.post("/auth/login", {
        ip: desde,
        cuerpo: { email: lector.email, password },
      });

    for (let i = 0; i < 10; i++) {
      assert.equal((await intento(`mala${i}`)).status, 401);
    }
    const bloqueado = await intento(lector.password);
    assert.equal(bloqueado.status, 429);
    assert.match(bloqueado.body.mensaje, /Demasiados intentos/);

    assert.equal((await intento(lector.password, "203.0.113.11")).status, 200);
  });

  it("los ingresos correctos no gastan intentos", async () => {
    const lector = await crearLector();
    for (let i = 0; i < 12; i++) {
      const res = await api.post("/auth/login", {
        ip: "203.0.113.20",
        cuerpo: { email: lector.email, password: lector.password },
      });
      assert.equal(res.status, 200);
    }
  });

  it("el registro permite 5 cuentas por hora por IP", async () => {
    const estados = [];
    for (let i = 0; i < 6; i++) {
      const res = await api.post("/auth/register", {
        ip: "203.0.113.30",
        cuerpo: {
          nombre: "R",
          email: `r${i}@prueba.com`,
          password: "secreto1",
        },
      });
      estados.push(res.status);
    }
    assert.deepEqual(estados, [201, 201, 201, 201, 201, 429]);
  });

  it("la API frena más de 300 peticiones por minuto de una IP", async () => {
    const respuestas = await Promise.all(
      Array.from({ length: 305 }, () =>
        api.get("/libros", { ip: "203.0.113.40" }),
      ),
    );
    const frenadas = respuestas.filter((r) => r.status === 429).length;
    assert.equal(frenadas, 5);
  });
});

describe("tamaño de la petición", () => {
  it("rechaza cuerpos de más de 20 KB con 413", async () => {
    const res = await api.post("/auth/login", {
      cuerpo: { email: `${"x".repeat(30000)}@a.com`, password: "x" },
    });
    assert.equal(res.status, 413);
    assert.ok(res.body.mensaje);
  });
});
