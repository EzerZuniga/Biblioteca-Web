const bd = require("../helpers/db");
const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const api = require("../helpers/api");
const { crearLector, crearAdmin, crearLibro } = require("../helpers/fixtures");
const prestamos = require("../../services/loans");

before(() => bd.crearBaseDePrueba());
after(() => bd.borrarBaseDePrueba());
beforeEach(() => bd.vaciarTablas());

describe("listados paginados", () => {
  it("parten el catálogo en páginas sin repetir ni saltar libros", async () => {
    const lector = await crearLector();
    for (let i = 1; i <= 25; i++) {
      await crearLibro({ titulo: `Libro ${String(i).padStart(2, "0")}` });
    }

    const ids = [];
    for (const pagina of [1, 2, 3]) {
      const res = await api.get(
        `/api/v1/libros?pagina=${pagina}&porPagina=10`,
        {
          token: lector.token,
        },
      );
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.paginacion, {
        pagina,
        porPagina: 10,
        total: 25,
        totalPaginas: 3,
      });
      ids.push(...res.body.datos.map((l) => l.id));
    }
    assert.equal(ids.length, 25);
    assert.equal(new Set(ids).size, 25);
  });

  it("usa 20 por página si no se indica", async () => {
    const lector = await crearLector();
    for (let i = 0; i < 21; i++) await crearLibro();

    const res = await api.get("/api/v1/libros", { token: lector.token });
    assert.equal(res.body.datos.length, 20);
    assert.equal(res.body.paginacion.totalPaginas, 2);
  });

  it("una página más allá del final llega vacía, sin error", async () => {
    const lector = await crearLector();
    await crearLibro();
    const res = await api.get("/api/v1/libros?pagina=9", {
      token: lector.token,
    });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.datos, []);
    assert.equal(res.body.paginacion.total, 1);
  });

  it("rechaza páginas y tamaños inválidos", async () => {
    const lector = await crearLector();
    for (const consulta of [
      "pagina=0",
      "pagina=abc",
      "porPagina=0",
      "porPagina=101",
    ]) {
      const res = await api.get(`/api/v1/libros?${consulta}`, {
        token: lector.token,
      });
      assert.equal(res.status, 400, consulta);
    }
  });

  it("combinan la búsqueda con la paginación", async () => {
    const lector = await crearLector();
    for (let i = 0; i < 3; i++) await crearLibro({ titulo: `Novela ${i}` });
    await crearLibro({ titulo: "Ensayo" });

    const res = await api.get("/api/v1/libros?titulo=Novela&porPagina=2", {
      token: lector.token,
    });
    assert.equal(res.body.datos.length, 2);
    assert.equal(res.body.paginacion.total, 3);
  });
});

describe("préstamos por estado", () => {
  it("el admin filtra por estado en el servidor", async () => {
    const admin = await crearAdmin();
    const libro = await crearLibro({ cantidad: 5 });
    const ids = [];
    for (let i = 0; i < 3; i++) {
      const lector = await crearLector();
      ids.push((await prestamos.solicitar(lector.id, libro.id)).id);
    }
    await prestamos.aprobar(ids[0]);

    const pendientes = await api.get("/api/v1/prestamos?estado=pendiente", {
      token: admin.token,
    });
    assert.equal(pendientes.body.paginacion.total, 2);
    assert.ok(pendientes.body.datos.every((p) => p.estado === "pendiente"));

    const invalido = await api.get("/api/v1/prestamos?estado=perdido", {
      token: admin.token,
    });
    assert.equal(invalido.status, 400);
    assert.equal(invalido.body.mensaje, "Estado no válido");
  });
});

describe("usuarios paginados", () => {
  it("el admin recorre los usuarios por páginas", async () => {
    const admin = await crearAdmin();
    for (let i = 0; i < 4; i++) await crearLector();

    const res = await api.get("/api/v1/usuarios?porPagina=2&pagina=3", {
      token: admin.token,
    });
    assert.equal(res.body.datos.length, 1);
    assert.equal(res.body.paginacion.total, 5);
  });
});
