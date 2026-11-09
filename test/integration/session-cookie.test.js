const bd = require("../helpers/db");
const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const api = require("../helpers/api");
const { crearLector, crearLibro } = require("../helpers/fixtures");

before(() => bd.crearBaseDePrueba());
after(() => bd.borrarBaseDePrueba());
beforeEach(() => bd.vaciarTablas());

const iniciarSesion = async (lector, { https = false } = {}) => {
  const peticion = api.post("/api/v1/auth/login", {
    cuerpo: { email: lector.email, password: lector.password },
  });
  if (https) peticion.set("X-Forwarded-Proto", "https");
  return peticion;
};

const atributos = (respuesta) =>
  respuesta.headers["set-cookie"][0].split(";").map((p) => p.trim());

describe("cookie de sesión", () => {
  it("es httpOnly, SameSite=Strict y dura lo mismo que el token", async () => {
    const res = await iniciarSesion(await crearLector());
    const cookie = atributos(res);
    assert.ok(cookie.includes("HttpOnly"));
    assert.ok(cookie.includes("SameSite=Strict"));
    assert.ok(cookie.includes("Path=/"));
    assert.ok(cookie.includes("Max-Age=28800"));
    assert.ok(!cookie.includes("Secure"), "en http local no puede ser Secure");
  });

  it("es Secure cuando la app está detrás de HTTPS, como en Railway", async () => {
    const res = await iniciarSesion(await crearLector(), { https: true });
    assert.ok(atributos(res).includes("Secure"));
  });

  it("basta para consultar la API, sin cabecera Authorization", async () => {
    const cookie = api.cookieDeSesion(await iniciarSesion(await crearLector()));
    const res = await api.get("/api/v1/auth/yo", { cookie });
    assert.equal(res.status, 200);
    assert.equal(res.body.rol, "usuario");
  });
});

describe("protección contra CSRF", () => {
  it("rechaza un cambio con cookie si falta la cabecera del frontend", async () => {
    const lector = await crearLector();
    const libro = await crearLibro();
    const cookie = api.cookieDeSesion(await iniciarSesion(lector));

    const res = await api.post("/api/v1/prestamos", {
      cookie,
      cuerpo: { libro_id: libro.id },
    });
    assert.equal(res.status, 403);
    const [{ total }] = await bd.consultar(
      "SELECT COUNT(*) AS total FROM prestamos",
    );
    assert.equal(Number(total), 0, "no debe crearse el préstamo");
  });

  it("acepta el cambio cuando lo envía el frontend", async () => {
    const lector = await crearLector();
    const libro = await crearLibro();
    const cookie = api.cookieDeSesion(await iniciarSesion(lector));

    const res = await api.post("/api/v1/prestamos", {
      cookie,
      frontend: true,
      cuerpo: { libro_id: libro.id },
    });
    assert.equal(res.status, 201);
  });

  it("no exige la cabecera a clientes con token Bearer", async () => {
    const lector = await crearLector();
    const libro = await crearLibro();
    const res = await api.post("/api/v1/prestamos", {
      token: lector.token,
      cuerpo: { libro_id: libro.id },
    });
    assert.equal(res.status, 201);
  });
});

describe("POST /auth/logout", () => {
  it("borra la cookie de sesión", async () => {
    const res = await api.post("/api/v1/auth/logout", { frontend: true });
    assert.equal(res.status, 200);
    const cookie = res.headers["set-cookie"][0];
    assert.match(cookie, /^sesion=;/);
    assert.match(cookie, /Expires=Thu, 01 Jan 1970/);
  });
});
