const bd = require("../ayudantes/bd");
const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const api = require("../ayudantes/api");
const { crearLector, crearAdmin } = require("../ayudantes/datos");

before(() => bd.crearBaseDePrueba());
after(() => bd.borrarBaseDePrueba());
beforeEach(() => bd.vaciarTablas());

const firmar = (datos) =>
  jwt.sign(datos, process.env.JWT_SECRET, { expiresIn: "1h" });

describe("POST /auth/register", () => {
  it("crea un lector, normaliza los datos e ignora un rol colado", async () => {
    const res = await api.post("/auth/register", {
      cuerpo: {
        nombre: " Ana ",
        email: " ANA@Prueba.com ",
        password: "secreto1",
        rol: "admin",
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.usuario.nombre, "Ana");
    assert.equal(res.body.usuario.email, "ana@prueba.com");
    assert.equal(res.body.usuario.rol, "usuario");
    assert.equal(res.body.usuario.password, undefined);
  });

  it("rechaza un email ya registrado", async () => {
    await crearLector({ email: "repetido@prueba.com" });
    const res = await api.post("/auth/register", {
      cuerpo: { nombre: "Otra", email: "repetido@prueba.com", password: "secreto1" },
    });
    assert.equal(res.status, 409);
    assert.equal(res.body.mensaje, "Ese email ya está registrado");
  });

  it("con registros simultáneos del mismo email crea uno y nunca responde 500", async () => {
    const respuestas = await Promise.all(
      [1, 2, 3].map(() =>
        api.post("/auth/register", {
          cuerpo: { nombre: "Doble", email: "doble@prueba.com", password: "secreto1" },
        }),
      ),
    );
    const estados = respuestas.map((r) => r.status).sort();
    assert.deepEqual(estados, [201, 409, 409]);
  });

  it("detalla todos los campos que faltan", async () => {
    const res = await api.post("/auth/register", { cuerpo: {} });
    assert.equal(res.status, 400);
    assert.deepEqual(
      res.body.errores.map((e) => e.campo),
      ["nombre", "email", "password"],
    );
  });

  it("rechaza un nombre más largo que la columna", async () => {
    const res = await api.post("/auth/register", {
      cuerpo: { nombre: "x".repeat(101), email: "l@prueba.com", password: "secreto1" },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.errores[0].campo, "nombre");
    assert.match(res.body.mensaje, /100 caracteres/);
  });
});

describe("POST /auth/login", () => {
  it("devuelve un token y los datos del usuario", async () => {
    const lector = await crearLector();
    const res = await api.post("/auth/login", {
      cuerpo: { email: lector.email.toUpperCase(), password: lector.password },
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.deepEqual(res.body.usuario, {
      id: lector.id,
      nombre: lector.nombre,
      rol: "usuario",
    });
  });

  it("rechaza una contraseña incorrecta", async () => {
    const lector = await crearLector();
    const res = await api.post("/auth/login", {
      cuerpo: { email: lector.email, password: "incorrecta" },
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.mensaje, "Email o contraseña incorrectos");
  });

  it("pide los datos que faltan sin detallar cuál", async () => {
    const res = await api.post("/auth/login", { cuerpo: {} });
    assert.equal(res.status, 400);
    assert.equal(res.body.mensaje, "Ingresa tu email y tu contraseña");
  });

  it("responde 400 en JSON a un cuerpo mal formado", async () => {
    const res = await api
      .post("/auth/login")
      .set("Content-Type", "application/json")
      .send("{malo");
    assert.equal(res.status, 400);
    assert.match(res.body.mensaje, /JSON/);
  });
});

describe("sesiones", () => {
  it("/auth/yo devuelve el rol actual", async () => {
    const lector = await crearLector();
    const res = await api.get("/auth/yo", { token: lector.token });
    assert.equal(res.status, 200);
    assert.equal(res.body.rol, "usuario");
  });

  it("sin token pide iniciar sesión, incluso antes de validar el cuerpo", async () => {
    const res = await api.post("/libros", { cuerpo: { titulo: "" } });
    assert.equal(res.status, 401);
    assert.equal(res.body.mensaje, "Debes iniciar sesión");
  });

  it("un token alterado se trata como sesión expirada", async () => {
    const res = await api.get("/libros", { token: "no.es.valido" });
    assert.equal(res.status, 401);
    assert.match(res.body.mensaje, /expiró/);
  });

  it("toma el rol de la base y no del token", async () => {
    const lector = await crearLector();
    const falso = firmar({ id: lector.id, nombre: "X", rol: "admin", v: 0 });
    const res = await api.get("/usuarios", { token: falso });
    assert.equal(res.status, 403);
  });

  it("acepta tokens emitidos antes de existir la versión de sesión", async () => {
    const lector = await crearLector();
    const antiguo = firmar({ id: lector.id, nombre: lector.nombre, rol: "usuario" });
    const res = await api.get("/libros", { token: antiguo });
    assert.equal(res.status, 200);
  });

  it("invalida la sesión de un usuario eliminado", async () => {
    const admin = await crearAdmin();
    const lector = await crearLector();
    await api.delete(`/usuarios/${lector.id}`, { token: admin.token }).expect(200);
    const res = await api.get("/libros", { token: lector.token });
    assert.equal(res.status, 401);
  });

  it("un admin degradado pierde el acceso en la siguiente petición", async () => {
    const admin = await crearAdmin();
    const otro = await crearAdmin();
    await api
      .put(`/usuarios/${otro.id}`, { token: admin.token, cuerpo: { rol: "usuario" } })
      .expect(200);

    assert.equal((await api.get("/usuarios", { token: otro.token })).status, 403);
    const yo = await api.get("/auth/yo", { token: otro.token });
    assert.equal(yo.body.rol, "usuario");
  });

  it("cambiar la contraseña cierra las sesiones anteriores", async () => {
    const admin = await crearAdmin();
    const lector = await crearLector();
    await api
      .put(`/usuarios/${lector.id}`, {
        token: admin.token,
        cuerpo: { password: "nuevaClave9" },
      })
      .expect(200);

    assert.equal((await api.get("/libros", { token: lector.token })).status, 401);
    const login = await api.post("/auth/login", {
      cuerpo: { email: lector.email, password: "nuevaClave9" },
    });
    assert.equal(login.status, 200);
    assert.equal((await api.get("/libros", { token: login.body.token })).status, 200);
  });
});

describe("rutas inexistentes", () => {
  it("responden 404 en JSON", async () => {
    const res = await api.get("/no-existe");
    assert.equal(res.status, 404);
    assert.equal(res.body.mensaje, "Ruta no encontrada");
  });
});
