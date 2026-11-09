const bd = require("../helpers/db");
const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const api = require("../helpers/api");
const { crearLector, crearAdmin, crearLibro } = require("../helpers/fixtures");
const prestamos = require("../../services/loans");

before(() => bd.crearBaseDePrueba());
after(() => bd.borrarBaseDePrueba());
beforeEach(() => bd.vaciarTablas());

const prestar = async (libroId) => {
  const lector = await crearLector();
  const prestamo = await prestamos.solicitar(lector.id, libroId);
  await prestamos.aprobar(prestamo.id);
};

describe("GET /libros", () => {
  it("informa total, prestados y disponibles", async () => {
    const lector = await crearLector();
    const libro = await crearLibro({ cantidad: 3 });
    await prestar(libro.id);

    const res = await api.get("/libros", { token: lector.token });
    assert.equal(res.status, 200);
    assert.deepEqual(
      {
        cantidad: res.body[0].cantidad,
        prestados: res.body[0].prestados,
        disponibles: res.body[0].disponibles,
      },
      { cantidad: 3, prestados: 1, disponibles: 2 },
    );
  });

  it("busca % y _ como texto literal, no como comodines", async () => {
    const lector = await crearLector();
    const raro = await crearLibro({ titulo: "Cien%Raro" });
    await crearLibro({ titulo: "Otro libro" });

    const porcentaje = await api.get(
      `/libros?titulo=${encodeURIComponent("%")}`,
      {
        token: lector.token,
      },
    );
    assert.deepEqual(
      porcentaje.body.map((l) => l.id),
      [raro.id],
    );

    const guion = await api.get(`/libros?titulo=${encodeURIComponent("_")}`, {
      token: lector.token,
    });
    assert.deepEqual(guion.body, []);
  });

  it("rechaza una búsqueda repetida en la URL", async () => {
    const lector = await crearLector();
    const res = await api.get("/libros?titulo=a&titulo=b", {
      token: lector.token,
    });
    assert.equal(res.status, 400);
  });
});

describe("POST /libros", () => {
  it("crea con la cantidad enviada como texto y categoría General", async () => {
    const admin = await crearAdmin();
    const res = await api.post("/libros", {
      token: admin.token,
      cuerpo: { titulo: " Nuevo ", autor: "Z", categoria: "", cantidad: "2" },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.libro.titulo, "Nuevo");
    assert.equal(res.body.libro.categoria, "General");
    assert.equal(res.body.libro.disponibles, 2);
  });

  it("solo lo puede hacer un administrador", async () => {
    const lector = await crearLector();
    const res = await api.post("/libros", {
      token: lector.token,
      cuerpo: { titulo: "T", autor: "A", cantidad: 1 },
    });
    assert.equal(res.status, 403);
  });
});

describe("PUT /libros/:id", () => {
  it("editar solo el título conserva la categoría y la cantidad", async () => {
    const admin = await crearAdmin();
    const libro = await crearLibro({ categoria: "Ensayo", cantidad: 2 });
    const res = await api.put(`/libros/${libro.id}`, {
      token: admin.token,
      cuerpo: { titulo: "Título nuevo" },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.libro.categoria, "Ensayo");
    assert.equal(res.body.libro.cantidad, 2);
  });

  it("reenviar la cantidad del formulario no inventa ejemplares", async () => {
    const admin = await crearAdmin();
    const libro = await crearLibro({ cantidad: 1 });
    await prestar(libro.id);

    const res = await api.put(`/libros/${libro.id}`, {
      token: admin.token,
      cuerpo: {
        titulo: "Corregido",
        autor: libro.autor,
        categoria: "General",
        cantidad: 1,
      },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.libro.disponibles, 0);
  });

  it("no deja bajar el total por debajo de los prestados", async () => {
    const admin = await crearAdmin();
    const libro = await crearLibro({ cantidad: 1 });
    await prestar(libro.id);

    const res = await api.put(`/libros/${libro.id}`, {
      token: admin.token,
      cuerpo: { cantidad: 0 },
    });
    assert.equal(res.status, 409);
  });

  it("valida el id de la URL y responde 404 si no existe", async () => {
    const admin = await crearAdmin();
    const invalido = await api.put("/libros/abc", {
      token: admin.token,
      cuerpo: {},
    });
    assert.equal(invalido.status, 400);
    assert.equal(invalido.body.mensaje, "El identificador no es válido");

    const inexistente = await api.put("/libros/999999", {
      token: admin.token,
      cuerpo: {},
    });
    assert.equal(inexistente.status, 404);
    assert.equal(inexistente.body.mensaje, "Libro no encontrado");
  });
});

describe("DELETE /libros/:id", () => {
  it("elimina un libro sin préstamos", async () => {
    const admin = await crearAdmin();
    const libro = await crearLibro();
    const res = await api.delete(`/libros/${libro.id}`, { token: admin.token });
    assert.equal(res.status, 200);
  });

  it("no elimina un libro con historial de préstamos", async () => {
    const admin = await crearAdmin();
    const libro = await crearLibro();
    await prestar(libro.id);
    const res = await api.delete(`/libros/${libro.id}`, { token: admin.token });
    assert.equal(res.status, 409);
  });
});
