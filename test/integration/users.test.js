const bd = require("../helpers/db");
const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const api = require("../helpers/api");
const { crearLector, crearAdmin, crearLibro } = require("../helpers/fixtures");
const prestamos = require("../../services/loans");

before(() => bd.crearBaseDePrueba());
after(() => bd.borrarBaseDePrueba());
beforeEach(() => bd.vaciarTablas());

describe("GET /usuarios", () => {
  it("no expone la contraseña ni la versión de sesión", async () => {
    const admin = await crearAdmin();
    await crearLector();
    const res = await api.get("/api/v1/usuarios", { token: admin.token });
    assert.equal(res.status, 200);
    for (const usuario of res.body.datos) {
      assert.equal("password" in usuario, false);
      assert.equal("version_token" in usuario, false);
    }
  });

  it("es solo para administradores", async () => {
    const lector = await crearLector();
    const res = await api.get("/api/v1/usuarios", { token: lector.token });
    assert.equal(res.status, 403);
  });
});

describe("PUT /usuarios/:id", () => {
  it("edita el nombre sin tocar la contraseña si llega vacía", async () => {
    const admin = await crearAdmin();
    const lector = await crearLector();
    const res = await api.put(`/api/v1/usuarios/${lector.id}`, {
      token: admin.token,
      cuerpo: { nombre: "Nombre nuevo", password: "" },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.usuario.nombre, "Nombre nuevo");

    const login = await api.post("/api/v1/auth/login", {
      cuerpo: { email: lector.email, password: lector.password },
    });
    assert.equal(login.status, 200);
  });

  it("rechaza un rol inventado y un email en uso", async () => {
    const admin = await crearAdmin();
    const lector = await crearLector();

    const rol = await api.put(`/api/v1/usuarios/${lector.id}`, {
      token: admin.token,
      cuerpo: { rol: "jefe" },
    });
    assert.equal(rol.status, 400);
    assert.equal(rol.body.mensaje, "Rol no válido");

    const email = await api.put(`/api/v1/usuarios/${lector.id}`, {
      token: admin.token,
      cuerpo: { email: admin.email },
    });
    assert.equal(email.status, 409);
  });

  it("un admin no puede quitarse su propio rol", async () => {
    const admin = await crearAdmin();
    const res = await api.put(`/api/v1/usuarios/${admin.id}`, {
      token: admin.token,
      cuerpo: { rol: "usuario" },
    });
    assert.equal(res.status, 400);
  });

  it("responde 404 si el usuario no existe", async () => {
    const admin = await crearAdmin();
    const res = await api.put("/api/v1/usuarios/999999", {
      token: admin.token,
      cuerpo: { nombre: "X" },
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.mensaje, "Usuario no encontrado");
  });
});

describe("DELETE /usuarios/:id", () => {
  it("un admin no puede eliminarse a sí mismo", async () => {
    const admin = await crearAdmin();
    const res = await api.delete(`/api/v1/usuarios/${admin.id}`, {
      token: admin.token,
    });
    assert.equal(res.status, 400);
  });

  it("no elimina a un usuario con historial de préstamos", async () => {
    const admin = await crearAdmin();
    const lector = await crearLector();
    const libro = await crearLibro();
    await prestamos.solicitar(lector.id, libro.id);

    const res = await api.delete(`/api/v1/usuarios/${lector.id}`, {
      token: admin.token,
    });
    assert.equal(res.status, 409);
  });
});
