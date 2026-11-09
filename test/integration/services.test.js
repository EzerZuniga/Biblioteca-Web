// Los servicios se prueban directamente, sin HTTP: así se ve que la lógica de
// negocio no depende de Express.
const bd = require("../helpers/db");
const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../../utils/errors");
const auth = require("../../services/auth");
const usuarios = require("../../services/users");
const libros = require("../../services/books");
const prestamos = require("../../services/loans");
const { crearLector, crearAdmin, crearLibro } = require("../helpers/fixtures");

before(() => bd.crearBaseDePrueba());
after(() => bd.borrarBaseDePrueba());
beforeEach(() => bd.vaciarTablas());

describe("servicio de auth", () => {
  it("registrar devuelve solo datos públicos", async () => {
    const usuario = await auth.registrar({
      nombre: "Ana",
      email: "ana@x.com",
      password: "secreto1",
    });
    assert.deepEqual(Object.keys(usuario).sort(), [
      "email",
      "id",
      "nombre",
      "rol",
    ]);
  });

  it("lanza errores con significado", async () => {
    const lector = await crearLector();
    await assert.rejects(
      auth.registrar({
        nombre: "X",
        email: lector.email,
        password: "secreto1",
      }),
      E.Conflicto,
    );
    await assert.rejects(
      auth.iniciarSesion({ email: lector.email, password: "mala" }),
      E.NoAutenticado,
    );
    await assert.rejects(auth.sesionDesdeToken(null), E.NoAutenticado);
  });

  it("sesionDesdeToken recupera al usuario y muere al cambiar la clave", async () => {
    const admin = await crearAdmin();
    const lector = await crearLector();
    assert.equal((await auth.sesionDesdeToken(lector.token)).id, lector.id);

    await usuarios.actualizar(
      lector.id,
      { password: "otraClave1" },
      { actorId: admin.id },
    );
    await assert.rejects(auth.sesionDesdeToken(lector.token), E.NoAutenticado);
  });
});

describe("servicio de usuarios", () => {
  it("guardarAdmin crea y luego actualiza", async () => {
    const datos = {
      nombre: "Jefa",
      email: "jefa@x.com",
      password: "ClaveJefa123",
    };
    assert.equal(
      await usuarios.guardarAdmin(datos, { cambiarNombre: false }),
      "creado",
    );
    assert.equal(await usuarios.hayAdmin(), true);
    assert.equal(
      await usuarios.guardarAdmin(datos, { cambiarNombre: false }),
      "actualizado",
    );
  });

  it("protege al admin de quitarse el rol o eliminarse", async () => {
    const admin = await crearAdmin();
    await assert.rejects(
      usuarios.actualizar(admin.id, { rol: "usuario" }, { actorId: admin.id }),
      E.SolicitudInvalida,
    );
    await assert.rejects(
      usuarios.eliminar(admin.id, { actorId: admin.id }),
      E.SolicitudInvalida,
    );
    await assert.rejects(
      usuarios.actualizar(999999, { nombre: "X" }, { actorId: admin.id }),
      E.NoEncontrado,
    );
  });
});

describe("servicios de libros y préstamos", () => {
  it("recorren el ciclo completo con las reglas de stock", async () => {
    const lector = await crearLector();
    const libro = await crearLibro({ cantidad: 1 });

    const prestamo = await prestamos.solicitar(lector.id, libro.id);
    assert.equal(prestamo.estado, "pendiente");
    await assert.rejects(prestamos.solicitar(lector.id, libro.id), E.Conflicto);

    await prestamos.aprobar(prestamo.id);
    assert.equal((await libros.listar()).datos[0].disponibles, 0);
    await assert.rejects(
      libros.actualizar(libro.id, { cantidad: 0 }),
      E.Conflicto,
    );
    await assert.rejects(libros.eliminar(libro.id), E.Conflicto);
    await assert.rejects(prestamos.aprobar(prestamo.id), E.SolicitudInvalida);

    await prestamos.devolver(prestamo.id);
    assert.equal((await libros.listar()).datos[0].disponibles, 1);
    await assert.rejects(prestamos.devolver(999999), E.NoEncontrado);
  });

  it("listarPara filtra según el rol", async () => {
    const ana = await crearLector();
    const beto = await crearLector();
    const libro = await crearLibro({ cantidad: 2 });
    await prestamos.solicitar(ana.id, libro.id);
    await prestamos.solicitar(beto.id, libro.id);

    assert.equal(
      (await prestamos.listarPara({ id: ana.id, rol: "usuario" })).datos.length,
      1,
    );
    assert.equal(
      (await prestamos.listarPara({ id: 0, rol: "admin" })).datos.length,
      2,
    );
  });
});
